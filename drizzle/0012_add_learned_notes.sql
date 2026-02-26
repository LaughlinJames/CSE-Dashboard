-- Create learned_notes table for "What I Learned" notes
CREATE TABLE IF NOT EXISTS "learned_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);

-- Add index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS "learned_notes_user_id_idx" ON "learned_notes" USING btree ("user_id");

-- Add index on created_at for newest-first listing
CREATE INDEX IF NOT EXISTS "learned_notes_created_at_idx" ON "learned_notes" USING btree ("created_at" DESC);
