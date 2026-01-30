"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { customersTable } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { createCustomerSchema, type CreateCustomerInput } from "@/lib/validations/customers";

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
