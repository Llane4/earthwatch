/**
 * Sincroniza EONET → Postgres. Sin dependencias de Next.js para poder
 * ejecutarse también desde un script (`npm run db:sync`).
 */
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fetchEonetEvents } from "@/lib/eonet/fetch";
import type { NaturalEvent } from "@/lib/eonet/types";

const { events, trackPoints, syncRuns } = schema;

/** Una sincronización "running" más antigua que esto se considera colgada. */
const LOCK_TTL_MS = 5 * 60_000;
const EVENT_CHUNK = 250;
const POINT_CHUNK = 1000;

export type SyncTrigger = "cron" | "lazy" | "manual";

export type SyncResult =
  | { skipped: true; reason: string }
  | {
      skipped: false;
      runId: number;
      fetched: number;
      inserted: number;
      updated: number;
      points: number;
      durationMs: number;
    };

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function toEventRow(e: NaturalEvent) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    categoryId: e.category.id,
    categoryTitle: e.category.title,
    eonetUrl: e.eonetUrl,
    sources: e.sources,
    closedAt: e.closed ? new Date(e.closed) : null,
    firstDate: new Date(e.track[0].date),
    latestDate: new Date(e.latest.date),
    latestLng: e.latest.coordinates[0],
    latestLat: e.latest.coordinates[1],
    trackCount: e.track.length,
  };
}

export async function syncEvents(opts: {
  trigger: SyncTrigger;
  days?: number;
}): Promise<SyncResult> {
  const db = getDb();
  const days = opts.days ?? 30;
  const started = Date.now();

  // Libera candados de sincronizaciones que murieron sin terminar.
  await db
    .update(syncRuns)
    .set({
      status: "error",
      finishedAt: new Date(),
      error: "Sin terminar: candado liberado por tiempo",
    })
    .where(
      and(
        eq(syncRuns.status, "running"),
        lt(syncRuns.startedAt, new Date(started - LOCK_TTL_MS)),
      ),
    );

  // El índice único parcial (status = 'running') hace atómico el candado:
  // si ya hay una sincronización en curso, este INSERT no inserta nada.
  const [run] = await db
    .insert(syncRuns)
    .values({ trigger: opts.trigger, status: "running", days })
    .onConflictDoNothing()
    .returning({ id: syncRuns.id });
  if (!run) {
    return { skipped: true, reason: "ya hay una sincronización en curso" };
  }

  try {
    const fetched = await fetchEonetEvents("all", days);
    let inserted = 0;
    let updated = 0;

    for (const group of chunk(fetched, EVENT_CHUNK)) {
      const rows = await db
        .insert(events)
        .values(group.map(toEventRow))
        .onConflictDoUpdate({
          target: events.id,
          set: {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            categoryId: sql`excluded.category_id`,
            categoryTitle: sql`excluded.category_title`,
            eonetUrl: sql`excluded.eonet_url`,
            sources: sql`excluded.sources`,
            closedAt: sql`excluded.closed_at`,
            firstDate: sql`excluded.first_date`,
            latestDate: sql`excluded.latest_date`,
            latestLng: sql`excluded.latest_lng`,
            latestLat: sql`excluded.latest_lat`,
            trackCount: sql`excluded.track_count`,
            updatedAt: sql`now()`,
          },
        })
        // xmax = 0 solo en filas recién insertadas (truco de Postgres).
        .returning({ inserted: sql<boolean>`(xmax = 0)` });
      for (const r of rows) {
        if (r.inserted) inserted++;
        else updated++;
      }
    }

    const points = fetched.flatMap((e) =>
      e.track.map((p) => ({
        eventId: e.id,
        date: new Date(p.date),
        lng: p.coordinates[0],
        lat: p.coordinates[1],
        magnitudeValue: p.magnitudeValue,
        magnitudeUnit: p.magnitudeUnit,
      })),
    );
    for (const group of chunk(points, POINT_CHUNK)) {
      await db
        .insert(trackPoints)
        .values(group)
        .onConflictDoUpdate({
          target: [trackPoints.eventId, trackPoints.date],
          set: {
            lng: sql`excluded.lng`,
            lat: sql`excluded.lat`,
            magnitudeValue: sql`excluded.magnitude_value`,
            magnitudeUnit: sql`excluded.magnitude_unit`,
          },
        });
    }

    await db
      .update(syncRuns)
      .set({
        status: "ok",
        finishedAt: new Date(),
        eventsFetched: fetched.length,
        eventsInserted: inserted,
        eventsUpdated: updated,
      })
      .where(eq(syncRuns.id, run.id));

    return {
      skipped: false,
      runId: run.id,
      fetched: fetched.length,
      inserted,
      updated,
      points: points.length,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    await db
      .update(syncRuns)
      .set({
        status: "error",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      })
      .where(eq(syncRuns.id, run.id));
    throw error;
  }
}

/** Fecha de la última sincronización correcta, o null si nunca hubo una. */
export async function lastSuccessfulSync(): Promise<Date | null> {
  const [row] = await getDb()
    .select({ finishedAt: syncRuns.finishedAt })
    .from(syncRuns)
    .where(eq(syncRuns.status, "ok"))
    .orderBy(desc(syncRuns.finishedAt))
    .limit(1);
  return row?.finishedAt ?? null;
}
