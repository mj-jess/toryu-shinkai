CREATE TABLE "allowed_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"added_by" text,
	"added_at" text DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	CONSTRAINT "allowed_users_discord_id_unique" UNIQUE("discord_id")
);
