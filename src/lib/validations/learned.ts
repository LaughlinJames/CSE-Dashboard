import { z } from "zod";

export const LEARNED_NOTE_CATEGORIES = [
  "AMS Core Tools",
  "Cloud Technologies",
  "Infrastructure",
] as const;

export const learnedNoteCategorySchema = z.enum(LEARNED_NOTE_CATEGORIES);

export const createLearnedNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  content: z.string().min(1, "Content is required"),
  category: learnedNoteCategorySchema,
});

export const updateLearnedNoteSchema = z.object({
  id: z.number().positive(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  category: learnedNoteCategorySchema.optional(),
});

export const deleteLearnedNoteSchema = z.object({
  id: z.number().positive(),
});

export type CreateLearnedNoteInput = z.infer<typeof createLearnedNoteSchema>;
export type UpdateLearnedNoteInput = z.infer<typeof updateLearnedNoteSchema>;
export type DeleteLearnedNoteInput = z.infer<typeof deleteLearnedNoteSchema>;
