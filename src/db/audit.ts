import { db } from "@/db";
import { customerAuditLogTable, todoAuditLogTable } from "@/db/schema";
import { SelectCustomer, SelectTodo } from "@/db/types";

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
 * Log a todo creation action
 */
export async function logTodoCreate(
  todoId: number,
  todoData: Partial<SelectTodo>,
  userId: string
) {
  await db.insert(todoAuditLogTable).values({
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
  userId: string
) {
  await db.insert(todoAuditLogTable).values({
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
  userId: string
) {
  await db.insert(todoAuditLogTable).values({
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
  userId: string
) {
  await db.insert(todoAuditLogTable).values({
    todoId,
    action: "uncomplete",
    fieldName: "completed",
    oldValue: "true",
    newValue: "false",
    userId,
  });
}

/**
 * Log individual field updates for a todo
 */
export async function logTodoUpdate(
  todoId: number,
  oldTodo: SelectTodo,
  newTodo: Partial<SelectTodo>,
  userId: string
) {
  const auditEntries = [];

  // Check each field for changes and log them
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
        // For non-date fields, simple string conversion
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

  // Insert all audit entries in a single transaction if there are changes
  if (auditEntries.length > 0) {
    await db.insert(todoAuditLogTable).values(auditEntries);
  }
}
