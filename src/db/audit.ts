import { db } from "@/db";
import { customerAuditLogTable } from "@/db/schema";
import { SelectCustomer } from "@/db/types";

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
