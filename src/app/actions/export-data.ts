"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  customersTable,
  customerNotesTable,
  customerAuditLogTable,
  customerNoteAuditLogTable,
  todosTable,
  todoAuditLogTable,
  learnedNotesTable,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function exportAllUserData() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [customers, customerNotes, todos, learnedNotes] = await Promise.all([
    db.select().from(customersTable).where(eq(customersTable.userId, userId)),
    db.select().from(customerNotesTable).where(eq(customerNotesTable.userId, userId)),
    db.select().from(todosTable).where(eq(todosTable.userId, userId)),
    db.select().from(learnedNotesTable).where(eq(learnedNotesTable.userId, userId)),
  ]);

  const customerIds = customers.map((c) => c.id);
  const noteIds = customerNotes.map((n) => n.id);
  const todoIds = todos.map((t) => t.id);

  const [customerAuditLog, customerNoteAuditLog, todoAuditLog] = await Promise.all([
    customerIds.length > 0
      ? db
          .select()
          .from(customerAuditLogTable)
          .where(inArray(customerAuditLogTable.customerId, customerIds))
      : Promise.resolve([]),
    noteIds.length > 0
      ? db
          .select()
          .from(customerNoteAuditLogTable)
          .where(inArray(customerNoteAuditLogTable.noteId, noteIds))
      : Promise.resolve([]),
    todoIds.length > 0
      ? db
          .select()
          .from(todoAuditLogTable)
          .where(inArray(todoAuditLogTable.todoId, todoIds))
      : Promise.resolve([]),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    customers,
    customerNotes,
    customerAuditLog,
    customerNoteAuditLog,
    todos,
    todoAuditLog,
    learnedNotes,
  };
}
