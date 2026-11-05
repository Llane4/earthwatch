CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category_id" text NOT NULL,
	"category_title" text NOT NULL,
	"eonet_url" text NOT NULL,
	"sources" jsonb NOT NULL,
	"closed_at" timestamp with time zone,
	"first_date" timestamp with time zone NOT NULL,
	"latest_date" timestamp with time zone NOT NULL,
	"latest_lng" double precision NOT NULL,
	"latest_lat" double precision NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"days" integer NOT NULL,
	"events_fetched" integer,
	"events_inserted" integer,
	"events_updated" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "track_points" (
	"event_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"lng" double precision NOT NULL,
	"lat" double precision NOT NULL,
	"magnitude_value" double precision,
	"magnitude_unit" text,
	CONSTRAINT "track_points_event_id_date_pk" PRIMARY KEY("event_id","date")
);
--> statement-breakpoint
ALTER TABLE "track_points" ADD CONSTRAINT "track_points_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_latest_date_idx" ON "events" USING btree ("latest_date");--> statement-breakpoint
CREATE INDEX "events_category_idx" ON "events" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "events_first_seen_idx" ON "events" USING btree ("first_seen_at");--> statement-breakpoint
CREATE INDEX "sync_runs_started_idx" ON "sync_runs" USING btree ("started_at");