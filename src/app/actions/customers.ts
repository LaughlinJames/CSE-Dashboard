"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { customersTable, customerNotesTable, customerAuditLogTable, todosTable } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { 
  createCustomerSchema, 
  updateCustomerSchema,
  addNoteSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type AddNoteInput
} from "@/lib/validations/customers";
import { eq, and, desc, gte, lte, between, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { logCustomerCreate, logCustomerUpdate, logCustomerArchive } from "@/db/audit";

export async function createCustomer(data: CreateCustomerInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = createCustomerSchema.parse(data);

  const customerData = {
    name: validatedData.name,
    lastPatchDate: validatedData.lastPatchDate || null,
    lastPatchVersion: validatedData.lastPatchVersion || null,
    temperament: validatedData.temperament,
    topology: validatedData.topology,
    dumbledoreStage: validatedData.dumbledoreStage,
    patchFrequency: validatedData.patchFrequency,
    mscUrl: validatedData.mscUrl || null,
    runbookUrl: validatedData.runbookUrl || null,
    snowUrl: validatedData.snowUrl || null,
    userId,
  };

  const result = await db.insert(customersTable).values(customerData).returning();

  // Log the customer creation
  if (result.length > 0) {
    await logCustomerCreate(result[0].id, customerData, userId);
  }

  revalidatePath("/dashboard");

  return { success: true };
}

// Zod schema for toggling archive status
const toggleArchiveSchema = z.object({
  customerId: z.number().positive(),
  archived: z.boolean(),
});

type ToggleArchiveInput = z.infer<typeof toggleArchiveSchema>;

export async function toggleArchiveCustomer(data: ToggleArchiveInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = toggleArchiveSchema.parse(data);

  // Update the customer's archived status, but only if they own it
  const result = await db
    .update(customersTable)
    .set({
      archived: validatedData.archived,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customersTable.id, validatedData.customerId),
        eq(customersTable.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Log the archive/unarchive action
  await logCustomerArchive(validatedData.customerId, validatedData.archived, userId);

  revalidatePath("/dashboard");

  return { success: true };
}

export async function updateCustomer(data: UpdateCustomerInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = updateCustomerSchema.parse(data);

  // Fetch the old customer data first for audit logging
  const oldCustomer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, validatedData.id),
        eq(customersTable.userId, userId)
      )
    );

  if (oldCustomer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  const updateData = {
    name: validatedData.name,
    lastPatchDate: validatedData.lastPatchDate || null,
    lastPatchVersion: validatedData.lastPatchVersion || null,
    temperament: validatedData.temperament,
    topology: validatedData.topology,
    dumbledoreStage: validatedData.dumbledoreStage,
    patchFrequency: validatedData.patchFrequency,
    mscUrl: validatedData.mscUrl || null,
    runbookUrl: validatedData.runbookUrl || null,
    snowUrl: validatedData.snowUrl || null,
    updatedAt: new Date(),
  };

  // Update the customer, but only if they own it
  const result = await db
    .update(customersTable)
    .set(updateData)
    .where(
      and(
        eq(customersTable.id, validatedData.id),
        eq(customersTable.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Log the changes to the audit log
  await logCustomerUpdate(validatedData.id, oldCustomer[0], updateData, userId);

  revalidatePath("/dashboard");

  return { success: true };
}

export async function addNote(data: AddNoteInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = addNoteSchema.parse(data);

  // Verify the customer belongs to this user before adding note
  const customer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, validatedData.customerId),
        eq(customersTable.userId, userId)
      )
    );

  if (customer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Add the note
  await db.insert(customerNotesTable).values({
    customerId: validatedData.customerId,
    note: validatedData.note,
    userId,
  });

  // Update the customer's updatedAt timestamp
  await db
    .update(customersTable)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(customersTable.id, validatedData.customerId));

  revalidatePath("/dashboard");

  return { success: true };
}

export async function getCustomerNotes(customerId: number) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify the customer belongs to this user
  const customer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, customerId),
        eq(customersTable.userId, userId)
      )
    );

  if (customer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Fetch all notes for this customer
  const notes = await db
    .select()
    .from(customerNotesTable)
    .where(eq(customerNotesTable.customerId, customerId))
    .orderBy(desc(customerNotesTable.createdAt));

  return notes;
}

// Zod schema for weekly report
const weeklyReportSchema = z.object({
  weekEndingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

type WeeklyReportInput = z.infer<typeof weeklyReportSchema>;

export type WeeklyReportData = {
  customer: {
    id: number;
    name: string;
    lastPatchDate: string | null;
    lastPatchVersion: string | null;
    temperament: string;
    topology: string;
    dumbledoreStage: number;
  };
  notes: Array<{
    id: number;
    note: string;
    createdAt: Date;
  }>;
};

export async function getWeeklyReport(data: WeeklyReportInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = weeklyReportSchema.parse(data);

  // Calculate week start date (previous Monday relative to end date)
  // Parse YYYY-MM-DD format and work in UTC to avoid timezone issues
  const [year, month, day] = validatedData.weekEndingDate.split('-').map(Number);
  const weekEndDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  
  const weekStartDate = new Date(weekEndDate);
  // Get day of week in UTC (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = weekStartDate.getUTCDay();
  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - daysToSubtract);
  weekStartDate.setUTCHours(0, 0, 0, 0);

  // Fetch all non-archived customers for this user, ordered alphabetically
  const customers = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.userId, userId),
        eq(customersTable.archived, false)
      )
    )
    .orderBy(customersTable.name);

  // Fetch notes for the week using SQL-level date filtering
  const weekNotes = await db
    .select()
    .from(customerNotesTable)
    .where(
      and(
        eq(customerNotesTable.userId, userId),
        gte(customerNotesTable.createdAt, weekStartDate),
        lte(customerNotesTable.createdAt, weekEndDate)
      )
    );

  // Build report data
  const reportData: WeeklyReportData[] = customers.map(customer => {
    const customerNotes = weekNotes
      .filter(note => note.customerId === customer.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        lastPatchDate: customer.lastPatchDate,
        lastPatchVersion: customer.lastPatchVersion,
        temperament: customer.temperament,
        topology: customer.topology,
        dumbledoreStage: customer.dumbledoreStage,
      },
      notes: customerNotes.map(note => ({
        id: note.id,
        note: note.note,
        createdAt: note.createdAt,
      })),
    };
  });

  return reportData;
}

// Zod schema for audit history query
const getAuditHistorySchema = z.object({
  customerId: z.number().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
});

type GetAuditHistoryInput = z.infer<typeof getAuditHistorySchema>;

export type AuditHistoryEntry = {
  id: number;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  userId: string;
};

/**
 * Get audit history for a customer
 * Optionally filter by date range
 */
export async function getCustomerAuditHistory(data: GetAuditHistoryInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = getAuditHistorySchema.parse(data);

  // Verify the customer belongs to this user
  const customer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, validatedData.customerId),
        eq(customersTable.userId, userId)
      )
    );

  if (customer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Build the query with optional date filters
  let query = db
    .select()
    .from(customerAuditLogTable)
    .where(eq(customerAuditLogTable.customerId, validatedData.customerId));

  // Apply date filters if provided
  const conditions = [eq(customerAuditLogTable.customerId, validatedData.customerId)];

  if (validatedData.startDate) {
    const [year, month, day] = validatedData.startDate.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    conditions.push(gte(customerAuditLogTable.createdAt, startDate));
  }

  if (validatedData.endDate) {
    const [year, month, day] = validatedData.endDate.split('-').map(Number);
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    conditions.push(lte(customerAuditLogTable.createdAt, endDate));
  }

  // Fetch audit log entries
  const auditEntries = await db
    .select()
    .from(customerAuditLogTable)
    .where(and(...conditions))
    .orderBy(desc(customerAuditLogTable.createdAt));

  return auditEntries.map(entry => ({
    id: entry.id,
    action: entry.action,
    fieldName: entry.fieldName,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    createdAt: entry.createdAt,
    userId: entry.userId,
  }));
}

export async function getTodosByCustomer(customerId: number) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify customer ownership
  const customer = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, customerId),
        eq(customersTable.userId, userId)
      )
    );

  if (customer.length === 0) {
    throw new Error("Customer not found or unauthorized");
  }

  // Get todos for this customer
  const todos = await db
    .select()
    .from(todosTable)
    .where(
      and(
        eq(todosTable.customerId, customerId),
        eq(todosTable.userId, userId),
        isNotNull(todosTable.noteId)
      )
    );

  return todos;
}
