-- Checklists and items (user-owned reusable lists)
CREATE TABLE IF NOT EXISTS "checklists" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"title" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "checklists_user_id_idx" ON "checklists" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "checklists_updated_at_idx" ON "checklists" USING btree ("updated_at" DESC);

CREATE TABLE IF NOT EXISTS "checklist_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"checklist_id" integer NOT NULL REFERENCES "checklists"("id") ON DELETE CASCADE,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "checklist_items_checklist_id_idx" ON "checklist_items" USING btree ("checklist_id");
