import { z } from "zod";

export const createInteractionInput = z.object({
  collectionId: z.string(),
  description: z.string().optional(),
  input: z.string().min(1, "Input is required"),
  output: z.string().min(1, "Output is required"),
  title: z.string().optional(),
});

export const updateInteractionInput = z.object({
  description: z.string().optional(),
  input: z.string().min(1, "Input is required").optional(),
  interactionId: z.string(),
  output: z.string().min(1, "Output is required").optional(),
  title: z.string().min(1, "Title is required").optional(),
});

export const deleteInteractionInput = z.object({
  interactionId: z.string(),
});

export const queryInteractionInput = z.object({
  limit: z.number().min(1).max(10).optional(),
  publicId: z.string(),
  query: z.string().min(1, "Query is required"),
});
