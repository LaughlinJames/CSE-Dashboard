"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { todosTable, customersTable } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas
const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().optional(),
  customerId: z.number().positive().optional(),
});

const updateTodoSchema = z.object({
  id: z.number().positive(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional(),
  customerId: z.number().positive().optional(),
  completed: z.boolean().optional(),
});

const deleteTodoSchema = z.object({
  id: z.number().positive(),
});

type CreateTodoInput = z.infer<typeof createTodoSchema>;
type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
type DeleteTodoInput = z.infer<typeof deleteTodoSchema>;

export async function createTodo(data: CreateTodoInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const validated = createTodoSchema.parse(data);

  await db.insert(todosTable).values({
    title: validated.title,
    description: validated.description,
    priority: validated.priority,
    dueDate: validated.dueDate || null,
    customerId: validated.customerId || null,
    userId,
  });

  revalidatePath("/todos");

  return { success: true };
}

export async function updateTodo(data: UpdateTodoInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const validated = updateTodoSchema.parse(data);

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (validated.title !== undefined) updateData.title = validated.title;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.priority !== undefined) updateData.priority = validated.priority;
  if (validated.dueDate !== undefined) updateData.dueDate = validated.dueDate || null;
  if (validated.customerId !== undefined) updateData.customerId = validated.customerId || null;
  if (validated.completed !== undefined) updateData.completed = validated.completed;

  const result = await db
    .update(todosTable)
    .set(updateData)
    .where(
      and(
        eq(todosTable.id, validated.id),
        eq(todosTable.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Todo not found or unauthorized");
  }

  revalidatePath("/todos");

  return { success: true };
}

export async function deleteTodo(data: DeleteTodoInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const validated = deleteTodoSchema.parse(data);

  const result = await db
    .delete(todosTable)
    .where(
      and(
        eq(todosTable.id, validated.id),
        eq(todosTable.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Todo not found or unauthorized");
  }

  revalidatePath("/todos");

  return { success: true };
}

export async function toggleTodoComplete(todoId: number) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // First get the current todo
  const todos = await db
    .select()
    .from(todosTable)
    .where(
      and(
        eq(todosTable.id, todoId),
        eq(todosTable.userId, userId)
      )
    );

  if (todos.length === 0) {
    throw new Error("Todo not found or unauthorized");
  }

  const todo = todos[0];

  // Toggle the completed status
  await db
    .update(todosTable)
    .set({
      completed: !todo.completed,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(todosTable.id, todoId),
        eq(todosTable.userId, userId)
      )
    );

  revalidatePath("/todos");

  return { success: true };
}

export async function getActiveCustomers() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const customers = await db
    .select({
      id: customersTable.id,
      name: customersTable.name,
    })
    .from(customersTable)
    .where(
      and(
        eq(customersTable.userId, userId),
        eq(customersTable.archived, false)
      )
    )
    .orderBy(customersTable.name);

  return customers;
}
