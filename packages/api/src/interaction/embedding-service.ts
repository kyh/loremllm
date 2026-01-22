/**
 * Embedding Service using AI SDK + OpenAI
 *
 * This service provides embedding generation using OpenAI's text-embedding-3-small
 * model which produces 1536-dimensional embeddings.
 */
import { embed, embedMany } from "ai";

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

/**
 * Generate embeddings for multiple texts in batch
 */
export const generateEmbeddingsBatch = async (
  texts: string[],
): Promise<number[][]> => {
  if (texts.length === 0) {
    return [];
  }

  const validTexts = texts.filter((text) => text && text.trim().length > 0);
  if (validTexts.length === 0) {
    throw new Error("Cannot generate embeddings for empty texts");
  }

  const { embeddings } = await embedMany({
    model: "openai/text-embedding-3-small",
    values: validTexts,
  });

  return embeddings;
};

/**
 * Calculate cosine similarity between two embeddings
 */
export const calculateEmbeddingSimilarity = (
  embedding1: number[],
  embedding2: number[],
): number => {
  if (embedding1.length !== embedding2.length) {
    throw new Error("Embeddings must have the same dimension");
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    const val1 = embedding1[i];
    const val2 = embedding2[i];
    if (val1 !== undefined && val2 !== undefined) {
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
};
