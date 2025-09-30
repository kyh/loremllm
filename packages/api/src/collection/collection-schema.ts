import { z } from "zod";

export const collectionByIdInput = z.object({
  collectionId: z.string(),
});

export const createCollectionInput = z.object({
  publicId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateCollectionInput = z.object({
  collectionId: z.string(),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const deleteCollectionInput = z.object({
  collectionId: z.string(),
});
