CREATE TABLE "admin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_email" text NOT NULL,
	"target_user_id" integer,
	"action_type" text NOT NULL,
	"action_details" text,
	"previous_value" text,
	"new_value" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_history" DROP CONSTRAINT "billing_history_type_check";--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_audit_admin_email" ON "admin_audit_log" USING btree ("admin_email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_admin_audit_target_user" ON "admin_audit_log" USING btree ("target_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_admin_audit_timestamp" ON "admin_audit_log" USING btree ("timestamp");--> statement-breakpoint
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_type_check" CHECK (type = ANY (ARRAY['subscription'::text, 'topup'::text, 'trial'::text, 'admin_adjustment'::text]));