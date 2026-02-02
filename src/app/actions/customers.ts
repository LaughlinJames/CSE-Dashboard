"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { customersTable } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { createCustomerSchema, type CreateCustomerInput } from "@/lib/validations/customers";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export async function createCustomer(data: CreateCustomerInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate input data
  const validatedData = createCustomerSchema.parse(data);

  // Convert lastPatchDate string to Date if provided
  const lastPatchDate = validatedData.lastPatchDate
    ? new Date(validatedData.lastPatchDate)
    : null;

  await db.insert(customersTable).values({
    name: validatedData.name,
    lastPatchDate: lastPatchDate,
    topology: validatedData.topology,
    dumbledoreStage: validatedData.dumbledoreStage,
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
