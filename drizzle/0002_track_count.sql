ALTER TABLE "events" ADD COLUMN "track_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
-- Rellena el conteo para los eventos que ya existían.
UPDATE "events" SET "track_count" = c.n
FROM (SELECT "event_id", count(*)::int AS n FROM "track_points" GROUP BY "event_id") c
WHERE c."event_id" = "events"."id";
