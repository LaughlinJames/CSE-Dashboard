-- Create todo_audit_log table
CREATE TABLE IF NOT EXISTS "todo_audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "todo_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"todo_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"field_name" varchar(100),
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);

-- Add foreign key constraint
ALTER TABLE "todo_audit_log" ADD CONSTRAINT "todo_audit_log_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;

-- Add index on todo_id for faster queries
CREATE INDEX IF NOT EXISTS "todo_audit_log_todo_id_idx" ON "todo_audit_log" USING btree ("todo_id");

-- Add index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS "todo_audit_log_created_at_idx" ON "todo_audit_log" USING btree ("created_at");

-- Add index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS "todo_audit_log_user_id_idx" ON "todo_audit_log" USING btree ("user_id");
