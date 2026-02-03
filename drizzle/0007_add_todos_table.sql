-- Create todos table
CREATE TABLE IF NOT EXISTS "todos" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "title" text NOT NULL,
  "description" text,
  "completed" boolean DEFAULT false NOT NULL,
  "priority" varchar(20) DEFAULT 'medium' NOT NULL,
  "due_date" date,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL
);
