import { z } from "zod";

const envSchema = z.object({
  AI_GATEWAY_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("LoremLLM <noreply@kyh.io>"),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  NEXT_PUBLIC_GITHUB_EMULATOR_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
