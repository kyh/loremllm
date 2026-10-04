import { z } from "zod";

export const collectionByIdInput = z.object({
  collectionId: z.string(),
});

export const createCollectionInput = z.object({
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
  name: z.string().min(1, "Name is required"),
  publicId: z.string().optional(),
});

export const updateCollectionInput = z.object({
  collectionId: z.string(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
  name: z.string().min(1, "Name is required").optional(),
});

export const deleteCollectionInput = z.object({
  collectionId: z.string(),
});
