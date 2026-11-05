import { and, asc, desc, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb, hasDatabase, schema } from "@/db";
import { fetchEonetEvents } from "./fetch";
import type {
  EventStatus,
  EventsPayload,
  NaturalEvent,
  TrackPoint,
} from "./types";

export const EVENTS_TAG = "events";

const { events, trackPoints } = schema;

/**
 * Eventos para la app. Se leen de Postgres (que el cron mantiene al día)
 * y, si la base aún está vacía, se consulta EONET directamente.
 * Se invalida con revalidateTag(EVENTS_TAG) al terminar cada sincronización.
 */
export async function getEvents(
  status: EventStatus,
  days: number,
): Promise<EventsPayload> {
  "use cache";
  cacheTag(EVENTS_TAG);
  cacheLife("hours");

  if (hasDatabase()) {
    const stored = await readFromDatabase(status, days);
    if (stored.length > 0) {
      return {
        events: stored,
        fetchedAt: new Date().toISOString(),
        source: "database",
      };
    }
  }

  return {
    events: await fetchEonetEvents(status, days),
    fetchedAt: new Date().toISOString(),
    source: "eonet",
  };
}

async function readFromDatabase(
  status: EventStatus,
  days: number,
): Promise<NaturalEvent[]> {
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
    db.select().from(events).where(where).orderBy(desc(events.latestDate)),
    db
      .select()
      .from(trackPoints)
      .where(
        inArray(
          trackPoints.eventId,
          db.select({ id: events.id }).from(events).where(where),
        ),
      )
      .orderBy(asc(trackPoints.eventId), asc(trackPoints.date)),
  ]);

  const tracks = new Map<string, TrackPoint[]>();
  for (const p of points) {
    const list = tracks.get(p.eventId) ?? [];
    list.push({
      date: p.date.toISOString(),
      coordinates: [p.lng, p.lat],
      magnitudeValue: p.magnitudeValue,
      magnitudeUnit: p.magnitudeUnit,
    });
    tracks.set(p.eventId, list);
  }

  const result: NaturalEvent[] = [];
  for (const row of rows) {
    const track = tracks.get(row.id);
    const latest = track?.at(-1);
    if (!track || !latest) continue;
    result.push({
      id: row.id,
      title: row.title,
      description: row.description,
      eonetUrl: row.eonetUrl,
      closed: row.closedAt?.toISOString() ?? null,
      category: { id: row.categoryId, title: row.categoryTitle },
      sources: row.sources,
      track,
      latest,
    });
  }
  return result;
}
