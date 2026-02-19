import { db } from "@/db";
import { customerAuditLogTable, customerNoteAuditLogTable, todoAuditLogTable } from "@/db/schema";
import { SelectCustomer, SelectTodo, SelectCustomerNote } from "@/db/types";

/**
 * Log a customer creation action
 */
export async function logCustomerCreate(
  customerId: number,
  customerData: Partial<SelectCustomer>,
  userId: string
) {
  await db.insert(customerAuditLogTable).values({
    customerId,
    action: "create",
    fieldName: null,
    oldValue: null,
    newValue: JSON.stringify(customerData),
    userId,
  });
}

/**
 * Log a customer archive/unarchive action
 */
export async function logCustomerArchive(
  customerId: number,
  archived: boolean,
  userId: string
) {
  await db.insert(customerAuditLogTable).values({
    customerId,
    action: archived ? "archive" : "unarchive",
    fieldName: "archived",
    oldValue: String(!archived),
    newValue: String(archived),
    userId,
  });
}

/**
 * Log individual field updates for a customer
 */
export async function logCustomerUpdate(
  customerId: number,
  oldCustomer: SelectCustomer,
  newCustomer: Partial<SelectCustomer>,
  userId: string
) {
  const auditEntries = [];

  // Check each field for changes and log them
  const fieldsToTrack: Array<keyof SelectCustomer> = [
    "name",
    "lastPatchDate",
    "lastPatchVersion",
    "temperament",
    "topology",
    "dumbledoreStage",
    "patchFrequency",
    "mscUrl",
    "runbookUrl",
    "snowUrl",
  ];

  for (const field of fieldsToTrack) {
    if (field in newCustomer && newCustomer[field] !== oldCustomer[field]) {
      const oldValue = oldCustomer[field];
      const newValue = newCustomer[field];

      // Convert values to strings for storage
      auditEntries.push({
        customerId,
        action: "update" as const,
        fieldName: field,
        oldValue: oldValue === null ? null : String(oldValue),
        newValue: newValue === null || newValue === undefined ? null : String(newValue),
        userId,
      });
    }
  }

  // Insert all audit entries in a single transaction if there are changes
  if (auditEntries.length > 0) {
    await db.insert(customerAuditLogTable).values(auditEntries);
  }
}

/**
 * Log a customer note creation action
 */
export async function logCustomerNoteCreate(
  noteId: number,
  noteData: Partial<SelectCustomerNote>,
  userId: string
) {
  await db.insert(customerNoteAuditLogTable).values({
    noteId,
    action: "create",
    fieldName: null,
    oldValue: null,
    newValue: JSON.stringify(noteData),
    userId,
  });
}

/**
 * Log individual field updates for a customer note
 */
export async function logCustomerNoteUpdate(
  noteId: number,
  oldNote: SelectCustomerNote,
  newNote: Partial<SelectCustomerNote>,
  userId: string
) {
  const auditEntries = [];

  // Check each field for changes and log them
  const fieldsToTrack: Array<keyof SelectCustomerNote> = [
    "note",
    "customerId",
  ];

  for (const field of fieldsToTrack) {
    if (field in newNote && newNote[field] !== oldNote[field]) {
      const oldValue = oldNote[field];
      const newValue = newNote[field];

      // Convert values to strings for storage
      auditEntries.push({
        noteId,
        action: "update" as const,
        fieldName: field,
        oldValue: oldValue === null ? null : String(oldValue),
        newValue: newValue === null || newValue === undefined ? null : String(newValue),
        userId,
      });
    }
  }

  // Insert all audit entries in a single transaction if there are changes
  if (auditEntries.length > 0) {
    await db.insert(customerNoteAuditLogTable).values(auditEntries);
  }
}

/**
 * Log a customer note deletion action
 */
export async function logCustomerNoteDelete(
  noteId: number,
  noteData: SelectCustomerNote,
  userId: string
) {
  await db.insert(customerNoteAuditLogTable).values({
    noteId,
    action: "delete",
    fieldName: null,
    oldValue: JSON.stringify(noteData),
    newValue: null,
    userId,
  });
}

/**
 * Log a todo creation action
 */
export async function logTodoCreate(
  todoId: number,
  todoData: Partial<SelectTodo>,
  userId: string,
  tx?: typeof db
) {
  const client = tx ?? db;
  await client.insert(todoAuditLogTable).values({
    todoId,
    action: "create",
    fieldName: null,
    oldValue: null,
    newValue: JSON.stringify(todoData),
    userId,
  });
}

/**
 * Log a todo deletion action
 */
export async function logTodoDelete(
  todoId: number,
  todoData: SelectTodo,
  userId: string,
  tx?: typeof db
) {
  const client = tx ?? db;
  await client.insert(todoAuditLogTable).values({
    todoId,
    action: "delete",
    fieldName: null,
    oldValue: JSON.stringify(todoData),
    newValue: null,
    userId,
  });
}

/**
 * Log a todo complete action
 */
export async function logTodoComplete(
  todoId: number,
  userId: string,
  tx?: typeof db
) {
  const client = tx ?? db;
  await client.insert(todoAuditLogTable).values({
    todoId,
    action: "complete",
    fieldName: "completed",
    oldValue: "false",
    newValue: "true",
    userId,
  });
}

/**
 * Log a todo uncomplete action
 */
export async function logTodoUncomplete(
  todoId: number,
  userId: string,
  tx?: typeof db
) {
  const client = tx ?? db;
  await client.insert(todoAuditLogTable).values({
    todoId,
    action: "uncomplete",
    fieldName: "completed",
    oldValue: "true",
    newValue: "false",
    userId,
  });
}

/**
 * Log individual field updates for a todo.
 * Always writes at least one row to todo_audit_log for every update (per-field rows when changed, or one summary row).
 */
export async function logTodoUpdate(
  todoId: number,
  oldTodo: SelectTodo,
  newTodo: Partial<SelectTodo>,
  userId: string,
  tx?: typeof db
) {
  const client = tx ?? db;
  const auditEntries: Array<{
    todoId: number;
    action: "update";
    fieldName: string | null;
    oldValue: string | null;
    newValue: string | null;
    userId: string;
  }> = [];

  // Check each field for changes and log them (including description for todo_audit_log)
  const fieldsToTrack: Array<keyof SelectTodo> = [
    "title",
    "description",
    "priority",
    "dueDate",
    "customerId",
    "completed",
  ];

  for (const field of fieldsToTrack) {
    if (field in newTodo) {
      const oldValue = oldTodo[field];
      const newValue = newTodo[field];

      // Normalize values for comparison (handle Date objects and strings)
      let normalizedOldValue: string | null;
      let normalizedNewValue: string | null;

      // Special handling for dates
      if (field === "dueDate") {
        normalizedOldValue = oldValue === null || oldValue === undefined 
          ? null 
          : oldValue instanceof Date 
            ? oldValue.toISOString().split('T')[0] 
            : String(oldValue);
        
        normalizedNewValue = newValue === null || newValue === undefined 
          ? null 
          : newValue instanceof Date 
            ? newValue.toISOString().split('T')[0] 
            : String(newValue);
      } else {
        // For non-date fields (title, description, priority, etc.), simple string conversion
        normalizedOldValue = oldValue === null || oldValue === undefined ? null : String(oldValue);
        normalizedNewValue = newValue === null || newValue === undefined ? null : String(newValue);
      }

      // Only log if values actually changed
      if (normalizedOldValue !== normalizedNewValue) {
        auditEntries.push({
          todoId,
          action: "update" as const,
          fieldName: field,
          oldValue: normalizedOldValue,
          newValue: normalizedNewValue,
          userId,
        });
      }
    }
  }

  // Always write at least one audit row for every update (so no update goes unlogged)
  if (auditEntries.length === 0) {
    auditEntries.push({
      todoId,
      action: "update" as const,
      fieldName: null,
      oldValue: JSON.stringify(oldTodo),
      newValue: JSON.stringify(newTodo),
      userId,
    });
  }

  await client.insert(todoAuditLogTable).values(auditEntries);
}
