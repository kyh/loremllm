import { z } from "zod";

// Zod schema for lorem ipsum and chat parameters
export const LoremParamsSchema = z.object({
  messages: z.array(z.unknown()).optional(), // UIMessage array - optional for flexibility
  collectionId: z.string().optional(),
  markdown: z.string().optional(),
  // Lorem parameters - all optional with defaults
  count: z.number().min(1).optional().default(1),
  paragraphLowerBound: z.number().min(1).optional().default(3),
  paragraphUpperBound: z.number().min(1).optional().default(7),
  sentenceLowerBound: z.number().min(1).optional().default(5),
  sentenceUpperBound: z.number().min(1).optional().default(15),
  suffix: z.string().optional().default("\n"),
  units: z
    .enum(["words", "sentences", "paragraphs"])
    .optional()
    .default("sentences"),
  words: z.array(z.string()).optional(),
});

export type LoremParams = z.infer<typeof LoremParamsSchema>;
