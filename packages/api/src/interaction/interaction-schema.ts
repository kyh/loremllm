import { z } from "zod";

export const createInteractionInput = z.object({
  collectionId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  input: z.string().min(1, "Input is required"),
  output: z.string().min(1, "Output is required"),
});

export const deleteInteractionInput = z.object({
  interactionId: z.string(),
});

export const queryInteractionInput = z.object({
  publicId: z.string(),
  query: z.string().min(1, "Query is required"),
  limit: z.number().min(1).max(10).optional(),
});
