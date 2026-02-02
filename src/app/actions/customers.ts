"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { customersTable, customerNotesTable } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { 
  createCustomerSchema, 
  updateCustomerSchema,
  addNoteSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type AddNoteInput
} from "@/lib/validations/customers";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export async function createCustomer(data: CreateCustomerInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = createCustomerSchema.parse(data);

  await db.insert(customersTable).values({
    name: validatedData.name,
    lastPatchDate: validatedData.lastPatchDate || null,
    lastPatchVersion: validatedData.lastPatchVersion || null,
    topology: validatedData.topology,
    dumbledoreStage: validatedData.dumbledoreStage,
    mscUrl: validatedData.mscUrl || null,
    runbookUrl: validatedData.runbookUrl || null,
    snowUrl: validatedData.snowUrl || null,
    userId,
  });

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

  // Update the customer, but only if they own it
  const result = await db
    .update(customersTable)
    .set({
      name: validatedData.name,
      lastPatchDate: validatedData.lastPatchDate || null,
      lastPatchVersion: validatedData.lastPatchVersion || null,
      topology: validatedData.topology,
      dumbledoreStage: validatedData.dumbledoreStage,
      mscUrl: validatedData.mscUrl || null,
      runbookUrl: validatedData.runbookUrl || null,
      snowUrl: validatedData.snowUrl || null,
      updatedAt: new Date(),
    })
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

  // Calculate week start date (7 days before end date)
  const weekEndDate = new Date(validatedData.weekEndingDate);
  weekEndDate.setHours(23, 59, 59, 999);
  
  const weekStartDate = new Date(weekEndDate);
  weekStartDate.setDate(weekStartDate.getDate() - 6);
  weekStartDate.setHours(0, 0, 0, 0);

  // Fetch all customers for this user
  const customers = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.userId, userId));

  // Fetch all notes for the week for all customers
  const allNotes = await db
    .select()
    .from(customerNotesTable)
    .where(eq(customerNotesTable.userId, userId));

  // Filter notes by date range in JavaScript (since Drizzle filtering by date can be tricky)
  const weekNotes = allNotes.filter(note => {
    const noteDate = new Date(note.createdAt);
    return noteDate >= weekStartDate && noteDate <= weekEndDate;
  });

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
