-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "billing_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"stripe_payment_intent" text,
	"amount" integer,
	"type" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "billing_history_type_check" CHECK (type = ANY (ARRAY['subscription'::text, 'topup'::text, 'trial'::text]))
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text,
	"content" text NOT NULL,
	"image_url" text,
	"is_favorite" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"style_filter" text
);
--> statement-breakpoint
CREATE TABLE "book_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer,
	"page_number" integer NOT NULL,
	"image_url" text,
	"content" text,
	"type" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"ai_image_url" text,
	"dedication" text,
	"audio_url" text,
	CONSTRAINT "book_pages_type_check" CHECK (type = ANY (ARRAY['title'::text, 'story'::text, 'conclusion'::text]))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text,
	"name" text,
	"credits" integer DEFAULT 3,
	"subscription_status" boolean DEFAULT false,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"child_name" text,
	"child_age" integer,
	CONSTRAINT "users_clerk_id_key" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text,
	"protagonist_name" text,
	"theme" text,
	"location" text,
	"is_favorite" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"style" text,
	"border_style" text,
	"page_count" integer DEFAULT 10,
	"style_filter" text,
	"dedicated_by" text DEFAULT 'Mummy and Daddy',
	"cover_image_url" text
);
--> statement-breakpoint
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_pages" ADD CONSTRAINT "book_pages_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_billing_user_id" ON "billing_history" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_stories_user_id" ON "stories" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_book_pages_book_id" ON "book_pages" USING btree ("book_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_users_clerk_id" ON "users" USING btree ("clerk_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_books_user_id" ON "books" USING btree ("user_id" int4_ops);
*/