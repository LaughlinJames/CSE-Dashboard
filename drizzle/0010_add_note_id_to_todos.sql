-- Add note_id column to todos table
ALTER TABLE "todos" ADD COLUMN "note_id" integer;

-- Add foreign key constraint
ALTER TABLE "todos" ADD CONSTRAINT "todos_note_id_customer_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "customer_notes"("id") ON DELETE set null ON UPDATE no action;
