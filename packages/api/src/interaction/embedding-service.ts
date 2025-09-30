/**
 * Embedding Service using Transformers.js
 *
 * This service provides local, offline embedding generation using the
 * all-MiniLM-L6-v2 model which produces 384-dimensional embeddings.
 */
import { env, pipeline } from "@xenova/transformers";

// Configure to run in Node.js environment
env.allowLocalModels = false;
env.useBrowserCache = false;

// Model configuration
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSION = 384;

/**
 * Type definitions for Transformers.js pipeline output
 * The feature extraction pipeline returns an object with a data property
 * containing the embedding vectors as a Float32Array or similar array-like structure
 */
type EmbeddingOutput = {
  data: ArrayLike<number>;
  dims?: number[];
  type?: string;
  size?: number;
};

// Cache the pipeline instance
let embeddingPipeline: Awaited<ReturnType<typeof pipeline>> | null = null;

/**
 * Initialize the embedding pipeline (lazy loading)
 */
async function getEmbeddingPipeline() {
  embeddingPipeline ??= await pipeline("feature-extraction", MODEL_NAME);
  return embeddingPipeline;
}

/**
 * Generate embeddings using Transformers.js
 * This provides local, offline embedding generation
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  try {
    const pipe = await getEmbeddingPipeline();

    // Generate embeddings
    // The pipeline return type is complex, so we cast it to our known type
    const rawOutput = await pipe(text, {
      pooling: "mean",
      normalize: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const output = rawOutput as unknown as EmbeddingOutput;

    // Extract the embedding array
    const embedding = Array.from(output.data);

    // Validate dimension
    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Expected embedding dimension ${EMBEDDING_DIMENSION}, got ${embedding.length}`,
      );
    }

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Generate embeddings for multiple texts in batch
 * This is more efficient than calling generateEmbedding multiple times
 */
export const generateEmbeddingsBatch = async (
  texts: string[],
): Promise<number[][]> => {
  if (texts.length === 0) {
    return [];
  }

  // Filter out empty texts
  const validTexts = texts.filter((text) => text && text.trim().length > 0);
  if (validTexts.length === 0) {
    throw new Error("Cannot generate embeddings for empty texts");
  }

  try {
    const pipe = await getEmbeddingPipeline();

    // Generate embeddings for all texts
    // The pipeline accepts string arrays, but TypeScript's union types make this complex
    const rawOutput = await pipe(
      validTexts as unknown as string,
      {
        pooling: "mean",
        normalize: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    );

    const output = rawOutput as unknown as EmbeddingOutput;

    // Extract embeddings
    const embeddings: number[][] = [];
    const dataArray = Array.from(output.data);

    for (let i = 0; i < validTexts.length; i++) {
      const start = i * EMBEDDING_DIMENSION;
      const end = start + EMBEDDING_DIMENSION;
      embeddings.push(dataArray.slice(start, end));
    }

    return embeddings;
  } catch (error) {
    console.error("Error generating embeddings batch:", error);
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between -1 and 1, where 1 means identical
 */
export const calculateEmbeddingSimilarity = (
  embedding1: number[],
  embedding2: number[],
): number => {
  if (embedding1.length !== embedding2.length) {
    throw new Error("Embeddings must have the same dimension");
  }

  if (
    embedding1.length !== EMBEDDING_DIMENSION ||
    embedding2.length !== EMBEDDING_DIMENSION
  ) {
    throw new Error(`Expected dimension ${EMBEDDING_DIMENSION}`);
  }

  // Calculate dot product
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

  // Calculate cosine similarity
  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

  return similarity;
};

/**
 * Get the embedding dimension for the current model
 * This helps with database schema validation
 */
export const getEmbeddingDimension = (): number => {
  return EMBEDDING_DIMENSION;
};
