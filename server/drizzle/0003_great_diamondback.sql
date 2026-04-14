ALTER TABLE "book_pages" ADD COLUMN "image_prompt" text;
ALTER TABLE "users" ADD COLUMN "subscription_cancel_at_period_end" boolean DEFAULT false;