import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tz = { withTimezone: true, mode: "date" } as const;

/** Copia local de los eventos de EONET (uno por evento). */
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    categoryId: text("category_id").notNull(),
    categoryTitle: text("category_title").notNull(),
    eonetUrl: text("eonet_url").notNull(),
    sources: jsonb("sources").$type<{ id: string; url: string }[]>().notNull(),
    closedAt: timestamp("closed_at", tz),
    firstDate: timestamp("first_date", tz).notNull(),
    latestDate: timestamp("latest_date", tz).notNull(),
    latestLng: doublePrecision("latest_lng").notNull(),
    latestLat: doublePrecision("latest_lat").notNull(),
    /** Primera vez que lo vimos: base para detectar eventos nuevos (alertas). */
    firstSeenAt: timestamp("first_seen_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [
    index("events_latest_date_idx").on(t.latestDate),
    index("events_category_idx").on(t.categoryId),
    index("events_first_seen_idx").on(t.firstSeenAt),
  ],
);

/** Posiciones de cada evento a lo largo del tiempo (trayectorias). */
export const trackPoints = pgTable(
  "track_points",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    date: timestamp("date", tz).notNull(),
    lng: doublePrecision("lng").notNull(),
    lat: doublePrecision("lat").notNull(),
    magnitudeValue: doublePrecision("magnitude_value"),
    magnitudeUnit: text("magnitude_unit"),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.date] })],
);

/** Registro de cada sincronización con EONET. */
export const syncRuns = pgTable(
  "sync_runs",
  {
    id: serial("id").primaryKey(),
    trigger: text("trigger").$type<"cron" | "lazy" | "manual">().notNull(),
    status: text("status").$type<"running" | "ok" | "error">().notNull(),
    startedAt: timestamp("started_at", tz).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", tz),
    days: integer("days").notNull(),
    eventsFetched: integer("events_fetched"),
    eventsInserted: integer("events_inserted"),
    eventsUpdated: integer("events_updated"),
    error: text("error"),
  },
  (t) => [
    index("sync_runs_started_idx").on(t.startedAt),
    // Candado atómico: Postgres solo admite una fila "running" a la vez.
    uniqueIndex("sync_runs_single_running_idx")
      .on(t.status)
      .where(sql`${t.status} = 'running'`),
  ],
);
