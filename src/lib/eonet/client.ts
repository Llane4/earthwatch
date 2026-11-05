import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb, hasDatabase, schema } from "@/db";
import { fetchEonetEvent, fetchEonetEvents } from "./fetch";
import { roundCoord, toSummary } from "./normalize";
import type {
  EventStatus,
  EventSummary,
  EventsPayload,
  LngLat,
  NaturalEvent,
} from "./types";

export const EVENTS_TAG = "events";

const { events, trackPoints } = schema;

/**
 * Lista ligera de eventos para el mapa. Se lee de Postgres (que el cron
 * mantiene al día) y, si la base aún está vacía, se consulta EONET.
 * Se invalida con revalidateTag(EVENTS_TAG) al terminar cada sincronización.
 */
export async function getEventSummaries(
  status: EventStatus,
  days: number,
): Promise<EventsPayload> {
  "use cache";
  cacheTag(EVENTS_TAG);
  cacheLife("hours");

  if (hasDatabase()) {
    const stored = await readSummaries(status, days);
    if (stored.length > 0) {
      return {
        events: stored,
        fetchedAt: new Date().toISOString(),
        source: "database",
      };
    }
  }

  const live = await fetchEonetEvents(status, days);
  return {
    events: live.map(toSummary),
    fetchedAt: new Date().toISOString(),
    source: "eonet",
  };
}

/** Detalle completo de un evento, o null si no existe. */
export async function getEventDetail(id: string): Promise<NaturalEvent | null> {
  "use cache";
  cacheTag(EVENTS_TAG, `event:${id}`);
  cacheLife("hours");

  if (hasDatabase()) {
    const stored = await readDetail(id);
    if (stored) return stored;
    // Si la base tiene datos, la lista salió de ella: el id no existe.
    // (EONET responde 500, no 404, ante ids desconocidos.)
    if (await databaseHasEvents()) return null;
  }
  return fetchEonetEvent(id);
}

async function databaseHasEvents(): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: events.id })
    .from(events)
    .limit(1);
  return row !== undefined;
}

async function readSummaries(
  status: EventStatus,
  days: number,
): Promise<EventSummary[]> {
  const db = getDb();
  const since = new Date(Date.now() - days * 86_400_000);

  const where = and(
    gte(events.latestDate, since),
    status === "open"
      ? isNull(events.closedAt)
      : status === "closed"
        ? isNotNull(events.closedAt)
        : undefined,
  );

  const [rows, points] = await Promise.all([
    db
      .select({
        id: events.id,
        title: events.title,
        categoryId: events.categoryId,
        closedAt: events.closedAt,
        latestDate: events.latestDate,
        latestLng: events.latestLng,
        latestLat: events.latestLat,
        trackCount: events.trackCount,
      })
      .from(events)
      .where(where)
      .orderBy(desc(events.latestDate)),
    // Solo los recorridos de eventos que se mueven (p. ej. ciclones).
    db
      .select({
        eventId: trackPoints.eventId,
        lng: trackPoints.lng,
        lat: trackPoints.lat,
      })
      .from(trackPoints)
      .where(
        inArray(
          trackPoints.eventId,
          db
            .select({ id: events.id })
            .from(events)
            .where(and(where, gt(events.trackCount, 1))),
        ),
      )
      .orderBy(asc(trackPoints.eventId), asc(trackPoints.date)),
  ]);

  const paths = new Map<string, LngLat[]>();
  for (const p of points) {
    const list = paths.get(p.eventId) ?? [];
    list.push([roundCoord(p.lng), roundCoord(p.lat)]);
    paths.set(p.eventId, list);
  }

  return rows.map((row) => {
    const path = paths.get(row.id);
    return {
      id: row.id,
      title: row.title,
      categoryId: row.categoryId,
      open: row.closedAt === null,
      date: row.latestDate.toISOString(),
      lng: roundCoord(row.latestLng),
      lat: roundCoord(row.latestLat),
      points: row.trackCount,
      ...(path && path.length > 1 && { path }),
    };
  });
}

async function readDetail(id: string): Promise<NaturalEvent | null> {
  const db = getDb();
  const [[row], points] = await Promise.all([
    db.select().from(events).where(eq(events.id, id)).limit(1),
    db
      .select()
      .from(trackPoints)
      .where(eq(trackPoints.eventId, id))
      .orderBy(asc(trackPoints.date)),
  ]);
  if (!row || points.length === 0) return null;

  const track = points.map((p) => ({
    date: p.date.toISOString(),
    coordinates: [p.lng, p.lat] as LngLat,
    magnitudeValue: p.magnitudeValue,
    magnitudeUnit: p.magnitudeUnit,
  }));

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    eonetUrl: row.eonetUrl,
    closed: row.closedAt?.toISOString() ?? null,
    category: { id: row.categoryId, title: row.categoryTitle },
    sources: row.sources,
    track,
    latest: track[track.length - 1],
  };
}
