-- Create customer_audit_log table
CREATE TABLE IF NOT EXISTS "customer_audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customer_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"customer_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"field_name" varchar(100),
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);

-- Add foreign key constraint
ALTER TABLE "customer_audit_log" ADD CONSTRAINT "customer_audit_log_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;

-- Add index on customer_id for faster queries
CREATE INDEX IF NOT EXISTS "customer_audit_log_customer_id_idx" ON "customer_audit_log" USING btree ("customer_id");

-- Add index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS "customer_audit_log_created_at_idx" ON "customer_audit_log" USING btree ("created_at");

-- Add index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS "customer_audit_log_user_id_idx" ON "customer_audit_log" USING btree ("user_id");
