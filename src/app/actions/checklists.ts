"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { checklistsTable, checklistItemsTable } from "@/db/schema";
import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  addChecklistItemSchema,
  createChecklistSchema,
  deleteChecklistItemSchema,
  deleteChecklistSchema,
  reorderChecklistItemsSchema,
  toggleChecklistItemSchema,
  updateChecklistItemSchema,
  updateChecklistSchema,
  type AddChecklistItemInput,
  type CreateChecklistInput,
  type DeleteChecklistInput,
  type DeleteChecklistItemInput,
  type ReorderChecklistItemsInput,
  type ToggleChecklistItemInput,
  type UpdateChecklistInput,
  type UpdateChecklistItemInput,
} from "@/lib/validations/checklists";

const CHECKLISTS_PATH = "/checklists";

async function getOwnedChecklistId(checklistId: number, userId: string) {
  const rows = await db
    .select({ id: checklistsTable.id })
    .from(checklistsTable)
    .where(and(eq(checklistsTable.id, checklistId), eq(checklistsTable.userId, userId)));
  return rows[0]?.id ?? null;
}

async function getOwnedItemWithChecklist(itemId: number, userId: string) {
  const rows = await db
    .select({
      itemId: checklistItemsTable.id,
      checklistId: checklistItemsTable.checklistId,
      checklistUserId: checklistsTable.userId,
      completed: checklistItemsTable.completed,
    })
    .from(checklistItemsTable)
    .innerJoin(checklistsTable, eq(checklistItemsTable.checklistId, checklistsTable.id))
    .where(eq(checklistItemsTable.id, itemId));
  const row = rows[0];
  if (!row || row.checklistUserId !== userId) return null;
  return { itemId: row.itemId, checklistId: row.checklistId, completed: row.completed };
}

async function touchChecklistUpdatedAt(checklistId: number) {
  await db
    .update(checklistsTable)
    .set({ updatedAt: new Date() })
    .where(eq(checklistsTable.id, checklistId));
}

export async function createChecklist(data: CreateChecklistInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = createChecklistSchema.parse(data);

  await db.insert(checklistsTable).values({
    title: validated.title,
    userId,
  });

  revalidatePath(CHECKLISTS_PATH);
  return { success: true };
}

export async function updateChecklist(data: UpdateChecklistInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = updateChecklistSchema.parse(data);

  const result = await db
    .update(checklistsTable)
    .set({ title: validated.title, updatedAt: new Date() })
    .where(and(eq(checklistsTable.id, validated.id), eq(checklistsTable.userId, userId)))
    .returning({ id: checklistsTable.id });

  if (result.length === 0) throw new Error("Checklist not found or unauthorized");

  revalidatePath(CHECKLISTS_PATH);
  return { success: true };
}

export async function deleteChecklist(data: DeleteChecklistInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = deleteChecklistSchema.parse(data);

  const result = await db
    .delete(checklistsTable)
    .where(and(eq(checklistsTable.id, validated.id), eq(checklistsTable.userId, userId)))
    .returning({ id: checklistsTable.id });

  if (result.length === 0) throw new Error("Checklist not found or unauthorized");

  revalidatePath(CHECKLISTS_PATH);
  return { success: true };
}

export async function addChecklistItem(data: AddChecklistItemInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = addChecklistItemSchema.parse(data);

  const owned = await getOwnedChecklistId(validated.checklistId, userId);
  if (!owned) throw new Error("Checklist not found or unauthorized");

  const [agg] = await db
    .select({ maxOrder: max(checklistItemsTable.sortOrder) })
    .from(checklistItemsTable)
    .where(eq(checklistItemsTable.checklistId, validated.checklistId));

  const nextOrder = (agg?.maxOrder ?? -1) + 1;

  await db.insert(checklistItemsTable).values({
    checklistId: validated.checklistId,
    text: validated.text,
    sortOrder: nextOrder,
  });

  await db
    .update(checklistsTable)
    .set({ updatedAt: new Date() })
    .where(eq(checklistsTable.id, validated.checklistId));

  revalidatePath(CHECKLISTS_PATH);
  return { success: true };
}

export async function updateChecklistItem(data: UpdateChecklistItemInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = updateChecklistItemSchema.parse(data);

  const owned = await getOwnedItemWithChecklist(validated.id, userId);
  if (!owned) throw new Error("Item not found or unauthorized");

  await db
    .update(checklistItemsTable)
    .set({ text: validated.text, updatedAt: new Date() })
    .where(eq(checklistItemsTable.id, validated.id));

  await touchChecklistUpdatedAt(owned.checklistId);

  revalidatePath(CHECKLISTS_PATH);
  return { success: true };
}

export async function toggleChecklistItem(data: ToggleChecklistItemInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = toggleChecklistItemSchema.parse(data);

  const owned = await getOwnedItemWithChecklist(validated.id, userId);
  if (!owned) throw new Error("Item not found or unauthorized");

  await db
    .update(checklistItemsTable)
    .set({
      completed: !owned.completed,
      updatedAt: new Date(),
    })
    .where(eq(checklistItemsTable.id, validated.id));

  await touchChecklistUpdatedAt(owned.checklistId);

  revalidatePath(CHECKLISTS_PATH);
  return { success: true };
}

export async function deleteChecklistItem(data: DeleteChecklistItemInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = deleteChecklistItemSchema.parse(data);

  const owned = await getOwnedItemWithChecklist(validated.id, userId);
  if (!owned) throw new Error("Item not found or unauthorized");

  await db.delete(checklistItemsTable).where(eq(checklistItemsTable.id, validated.id));

  await touchChecklistUpdatedAt(owned.checklistId);

  revalidatePath(CHECKLISTS_PATH);
  return { success: true };
}

export async function reorderChecklistItems(data: ReorderChecklistItemsInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = reorderChecklistItemsSchema.parse(data);

  const owned = await getOwnedChecklistId(validated.checklistId, userId);
  if (!owned) throw new Error("Checklist not found or unauthorized");

  const existing = await db
    .select({ id: checklistItemsTable.id })
    .from(checklistItemsTable)
    .where(eq(checklistItemsTable.checklistId, validated.checklistId));

  const idSet = new Set(existing.map((r) => r.id));
  if (validated.orderedItemIds.length !== idSet.size) {
    throw new Error("Invalid item order");
  }
  for (const id of validated.orderedItemIds) {
    if (!idSet.has(id)) throw new Error("Invalid item order");
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < validated.orderedItemIds.length; i++) {
      await tx
        .update(checklistItemsTable)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(checklistItemsTable.id, validated.orderedItemIds[i]),
            eq(checklistItemsTable.checklistId, validated.checklistId)
          )
        );
    }
  });

  await touchChecklistUpdatedAt(validated.checklistId);

  revalidatePath(CHECKLISTS_PATH);
  return { success: true };
}
