import { integer, pgTable, varchar, text, timestamp, date, boolean } from "drizzle-orm/pg-core";

// Customers table - track customer details
export const customersTable = pgTable("customers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  lastPatchDate: date("last_patch_date"),
  lastPatchVersion: varchar("last_patch_version", { length: 100 }),
  topology: varchar({ length: 20 }).notNull().default("dev"), // dev, qa, stage, prod
  dumbledoreStage: integer("dumbledore_stage").notNull().default(1), // 1-9
  mscUrl: text("msc_url"), // URL for MSC button
  runbookUrl: text("runbook_url"), // URL for Runbook button
  archived: boolean().notNull().default(false), // Archive status
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: text("user_id").notNull(), // Clerk user ID who owns this customer record
});

// Customer Notes table - track timestamped notes for each customer
export const customerNotesTable = pgTable("customer_notes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: text("user_id").notNull(), // Clerk user ID who created this note
});
