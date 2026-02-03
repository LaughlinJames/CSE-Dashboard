"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { todosTable, customersTable } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logTodoCreate, logTodoUpdate, logTodoDelete, logTodoComplete, logTodoUncomplete } from "@/db/audit";

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

  // Format date to ensure it's stored correctly in local timezone
  let formattedDueDate = null;
  if (validated.dueDate) {
    // Parse the date string and format it to YYYY-MM-DD to avoid timezone issues
    const dateParts = validated.dueDate.split('-');
    if (dateParts.length === 3) {
      formattedDueDate = validated.dueDate; // Already in YYYY-MM-DD format
    }
  }

  const result = await db.insert(todosTable).values({
    title: validated.title,
    description: validated.description,
    priority: validated.priority,
    dueDate: formattedDueDate,
    customerId: validated.customerId || null,
    userId,
  }).returning();

  // Log the creation
  if (result.length > 0) {
    await logTodoCreate(result[0].id, result[0], userId);
  }

  revalidatePath("/todos");

  return { success: true };
}

export async function updateTodo(data: UpdateTodoInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const validated = updateTodoSchema.parse(data);

  // Get the old todo data before updating
  const oldTodos = await db
    .select()
    .from(todosTable)
    .where(
      and(
        eq(todosTable.id, validated.id),
        eq(todosTable.userId, userId)
      )
    );

  if (oldTodos.length === 0) {
    throw new Error("Todo not found or unauthorized");
  }

  const oldTodo = oldTodos[0];

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (validated.title !== undefined) updateData.title = validated.title;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.priority !== undefined) updateData.priority = validated.priority;
  if (validated.dueDate !== undefined) {
    // Format date to ensure it's stored correctly in local timezone
    if (validated.dueDate) {
      const dateParts = validated.dueDate.split('-');
      if (dateParts.length === 3) {
        updateData.dueDate = validated.dueDate; // Already in YYYY-MM-DD format
      }
    } else {
      updateData.dueDate = null;
    }
  }
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

  // Log the update
  await logTodoUpdate(validated.id, oldTodo, updateData, userId);

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

  // Log the deletion
  await logTodoDelete(validated.id, result[0], userId);

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
  const newCompletedStatus = !todo.completed;

  // Toggle the completed status
  await db
    .update(todosTable)
    .set({
      completed: newCompletedStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(todosTable.id, todoId),
        eq(todosTable.userId, userId)
      )
    );

  // Log the completion/uncompletion
  if (newCompletedStatus) {
    await logTodoComplete(todoId, userId);
  } else {
    await logTodoUncomplete(todoId, userId);
  }

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
