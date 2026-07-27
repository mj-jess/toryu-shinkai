CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"actor" text NOT NULL,
	"source" text NOT NULL,
	"entity" text NOT NULL,
	"action" text NOT NULL,
	"entity_ref" text,
	"target_name" text DEFAULT '' NOT NULL,
	"changes" text
);
