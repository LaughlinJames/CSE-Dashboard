import { z } from "zod";

// Schema for creating a customer
export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255, "Name is too long"),
  lastPatchDate: z.string().optional(),
  topology: z.enum(["dev", "qa", "stage", "prod"]).default("dev"),
  dumbledoreStage: z.number().int().min(1).max(9).default(1),
});

// Schema for updating a customer
export const updateCustomerSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1, "Customer name is required").max(255, "Name is too long"),
  lastPatchDate: z.string().optional().nullable(),
  topology: z.enum(["dev", "qa", "stage", "prod"]),
  dumbledoreStage: z.number().int().min(1).max(9),
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
