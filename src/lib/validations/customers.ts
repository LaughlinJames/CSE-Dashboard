import { z } from "zod";

// Schema for creating a customer
export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255, "Name is too long"),
  lastPatchDate: z.string().optional(),
  topology: z.enum(["dev", "qa", "stage", "prod"]).default("dev"),
  dumbledoreStage: z.number().int().min(1).max(9).default(1),
});

// Type inference
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
