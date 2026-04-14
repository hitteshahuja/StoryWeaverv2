DROP TABLE "stories" CASCADE;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "is_public" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "embedding" vector(768);