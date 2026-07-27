CREATE TABLE "user_profiles" (
	"discord_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"updated_at" text DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
