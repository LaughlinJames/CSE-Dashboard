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
