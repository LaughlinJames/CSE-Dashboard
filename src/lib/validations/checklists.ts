import { z } from "zod";

export const createChecklistSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
});

export const updateChecklistSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
});

export const deleteChecklistSchema = z.object({
  id: z.number().int().positive(),
});

export const addChecklistItemSchema = z.object({
  checklistId: z.number().int().positive(),
  text: z.string().min(1, "Item text is required").max(2000, "Item too long"),
});

export const updateChecklistItemSchema = z.object({
  id: z.number().int().positive(),
  text: z.string().min(1, "Item text is required").max(2000, "Item too long"),
});

export const toggleChecklistItemSchema = z.object({
  id: z.number().int().positive(),
});

export const deleteChecklistItemSchema = z.object({
  id: z.number().int().positive(),
});

export const reorderChecklistItemsSchema = z.object({
  checklistId: z.number().int().positive(),
  orderedItemIds: z.array(z.number().int().positive()).max(500),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;
export type DeleteChecklistInput = z.infer<typeof deleteChecklistSchema>;
export type AddChecklistItemInput = z.infer<typeof addChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type ToggleChecklistItemInput = z.infer<typeof toggleChecklistItemSchema>;
export type DeleteChecklistItemInput = z.infer<typeof deleteChecklistItemSchema>;
export type ReorderChecklistItemsInput = z.infer<typeof reorderChecklistItemsSchema>;
