CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"passport" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"gym" text NOT NULL,
	"enrolled_at" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"registered_by" text,
	"deactivated_by" text,
	"deactivated_at" text,
	"created_at" text DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"updated_at" text DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	CONSTRAINT "enrollments_passport_unique" UNIQUE("passport"),
	CONSTRAINT "enrollments_phone_unique" UNIQUE("phone"),
	CONSTRAINT "enrollments_gym_check" CHECK ("enrollments"."gym" IN ('sandy', 'vinewood', 'both'))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
