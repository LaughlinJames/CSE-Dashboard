import { z } from "zod";

// Schema for creating a customer
export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255, "Name is too long"),
  lastPatchDate: z.string().optional(),
  lastPatchVersion: z.string().max(100, "Version is too long").optional(),
  temperament: z.enum(["happy", "satisfied", "neutral", "concerned", "frustrated"]).default("neutral"),
  topology: z.enum(["dev", "qa", "stage", "prod"]).default("dev"),
  dumbledoreStage: z.number().int().min(1).max(9).default(1),
  mscUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  runbookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  snowUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

// Schema for updating a customer
export const updateCustomerSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1, "Customer name is required").max(255, "Name is too long"),
  lastPatchDate: z.string().optional().nullable(),
  lastPatchVersion: z.string().max(100, "Version is too long").optional().nullable(),
  temperament: z.enum(["happy", "satisfied", "neutral", "concerned", "frustrated"]),
  topology: z.enum(["dev", "qa", "stage", "prod"]),
  dumbledoreStage: z.number().int().min(1).max(9),
  mscUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  runbookUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  snowUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
});

// Schema for adding a note
export const addNoteSchema = z.object({
  customerId: z.number().positive(),
  note: z.string().min(1, "Note cannot be empty").max(5000, "Note is too long"),
});

// Type inference
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
