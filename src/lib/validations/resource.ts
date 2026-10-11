
import { z } from "zod";

export const createResourceSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.string().trim().min(2).max(50),
  location: z.string().trim().min(2).max(255),
  capacity: z.number().int().min(1).max(10000),
});


export const updateResourceSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.string().trim().min(2).max(50),
  location: z.string().trim().min(2).max(255),
  capacity: z.number().int().min(1).max(10000),
});


export type CreateResourceInput = z.infer<
  typeof createResourceSchema
>;
