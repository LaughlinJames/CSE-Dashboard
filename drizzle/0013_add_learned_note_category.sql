-- Add category to learned_notes for "What I Learned" notes
ALTER TABLE "learned_notes" ADD COLUMN IF NOT EXISTS "category" varchar(50) NOT NULL DEFAULT 'AMS Core Tools';
