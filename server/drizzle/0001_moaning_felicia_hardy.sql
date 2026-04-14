CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "is_public" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "consent_given" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "consent_image" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "consent_voice" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "consent_privacy" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "consent_timestamp" timestamp;