"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { learnedNotesTable } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  createLearnedNoteSchema,
  updateLearnedNoteSchema,
  deleteLearnedNoteSchema,
  type CreateLearnedNoteInput,
  type UpdateLearnedNoteInput,
  type DeleteLearnedNoteInput,
} from "@/lib/validations/learned";

export async function createLearnedNote(data: CreateLearnedNoteInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const validated = createLearnedNoteSchema.parse(data);

  await db.insert(learnedNotesTable).values({
    title: validated.title,
    content: validated.content,
    category: validated.category,
    userId,
  });

  revalidatePath("/what-i-learned");
}

export async function updateLearnedNote(data: UpdateLearnedNoteInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const validated = updateLearnedNoteSchema.parse(data);

  const result = await db
    .update(learnedNotesTable)
    .set({
      ...(validated.title !== undefined && { title: validated.title }),
      ...(validated.content !== undefined && { content: validated.content }),
      ...(validated.category !== undefined && { category: validated.category }),
    })
    .where(
      and(
        eq(learnedNotesTable.id, validated.id),
        eq(learnedNotesTable.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Note not found or unauthorized");
  }

  revalidatePath("/what-i-learned");
}

export async function deleteLearnedNote(data: DeleteLearnedNoteInput) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const validated = deleteLearnedNoteSchema.parse(data);

  const result = await db
    .delete(learnedNotesTable)
    .where(
      and(
        eq(learnedNotesTable.id, validated.id),
        eq(learnedNotesTable.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Note not found or unauthorized");
  }

  revalidatePath("/what-i-learned");
}
