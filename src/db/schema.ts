import { integer, pgTable, varchar, text, timestamp, date, boolean } from "drizzle-orm/pg-core";

// Customers table - track customer details
export const customersTable = pgTable("customers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  lastPatchDate: date("last_patch_date"),
  lastPatchVersion: varchar("last_patch_version", { length: 100 }),
  temperament: varchar({ length: 20 }).notNull().default("neutral"), // happy, satisfied, neutral, concerned, frustrated
  topology: varchar({ length: 20 }).notNull().default("dev"), // dev, qa, stage, prod
  dumbledoreStage: integer("dumbledore_stage").notNull().default(1), // 1-9
  patchFrequency: varchar("patch_frequency", { length: 20 }).notNull().default("monthly"), // monthly or quarterly
  workLoad: varchar("work_load", { length: 20 }).notNull().default("medium"), // low, medium, high
  cloudManager: varchar("cloud_manager", { length: 20 }).notNull().default("no"), // no, implementing, yes
  products: varchar({ length: 20 }).notNull().default("sites"), // sites, assets, sites and assets
  mscUrl: text("msc_url"), // URL for MSC button
  runbookUrl: text("runbook_url"), // URL for Runbook button
  snowUrl: text("snow_url"), // URL for SNOW button
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

// Customer Audit Log table - track all changes to customer records
export const customerAuditLogTable = pgTable("customer_audit_log", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  action: varchar({ length: 50 }).notNull(), // create, update, archive, unarchive
  fieldName: varchar("field_name", { length: 100 }), // Field that was changed (null for create/archive actions)
  oldValue: text("old_value"), // Previous value (JSON stringified for complex types)
  newValue: text("new_value"), // New value (JSON stringified for complex types)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: text("user_id").notNull(), // Clerk user ID who made the change
});

// Customer Note Audit Log table - track all changes to customer note records
export const customerNoteAuditLogTable = pgTable("customer_note_audit_log", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  noteId: integer("note_id")
    .notNull()
    .references(() => customerNotesTable.id, { onDelete: "cascade" }),
  action: varchar({ length: 50 }).notNull(), // create, update, delete
  fieldName: varchar("field_name", { length: 100 }), // Field that was changed (null for create/delete actions)
  oldValue: text("old_value"), // Previous value (JSON stringified for complex types)
  newValue: text("new_value"), // New value (JSON stringified for complex types)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: text("user_id").notNull(), // Clerk user ID who made the change
});

// Todos table - track user to-do items
export const todosTable = pgTable("todos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean().notNull().default(false),
  priority: varchar({ length: 20 }).notNull().default("medium"), // low, medium, high
  dueDate: date("due_date"),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }), // Optional link to customer
  noteId: integer("note_id").references(() => customerNotesTable.id, { onDelete: "set null" }), // Optional link to note this todo was created from
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: text("user_id").notNull(), // Clerk user ID who owns this todo
});

// Todo Audit Log table - track all changes to todo records
export const todoAuditLogTable = pgTable("todo_audit_log", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  todoId: integer("todo_id")
    .notNull()
    .references(() => todosTable.id, { onDelete: "cascade" }),
  action: varchar({ length: 50 }).notNull(), // create, update, complete, uncomplete, delete
  fieldName: varchar("field_name", { length: 100 }), // Field that was changed (null for create/delete/complete/uncomplete actions)
  oldValue: text("old_value"), // Previous value (JSON stringified for complex types)
  newValue: text("new_value"), // New value (JSON stringified for complex types)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: text("user_id").notNull(), // Clerk user ID who made the change
});
