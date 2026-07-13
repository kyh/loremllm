/**
 * Embedding Service using AI SDK + OpenAI
 *
 * This service provides embedding generation using OpenAI's text-embedding-3-small
 * model which produces 1536-dimensional embeddings.
 */
import { embed } from "ai";

/**
 * Generate embedding for a single text using OpenAI
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const { embedding } = await embed({
    model: "openai/text-embedding-3-small",
    value: text,
  });

  return embedding;
};
