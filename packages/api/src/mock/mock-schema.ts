import { z } from "zod";

// ============================================================================
// COLLECTION SCHEMAS
// ============================================================================

export const createCollectionInput = z.object({
  publicId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateCollectionInput = z.object({
  collectionId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const collectionByIdInput = z.object({
  collectionId: z.string(),
});

export const deleteCollectionInput = z.object({
  collectionId: z.string(),
});

// ============================================================================
// INTERACTION SCHEMAS
// ============================================================================

export const createInteractionInput = z.object({
  collectionId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  input: z.string(),
  output: z.string(),
});

export const deleteInteractionInput = z.object({
  interactionId: z.string(),
});

// ============================================================================
// PUBLIC SCHEMAS (for unauthenticated access)
// ============================================================================

export const publicCollectionByPublicIdInput = z.object({
  publicId: z.string(),
});

export const queryInteractionInput = z.object({
  publicId: z.string(),
  query: z.string(),
  limit: z.number().min(1).max(10).optional().default(1),
});
