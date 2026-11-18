import { embed } from "ai";

/**
 * Generate embedding for a single text using OpenAI
 */
export const generateEmbedding = async (text: string) => {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const { embedding } = await embed({
    model: "openai/text-embedding-3-small",
    value: text,
  });

  return embedding;
};
