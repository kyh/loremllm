import { z } from "zod";

/**
 * Application configuration read from the environment.
 *
 * Every key is optional or defaulted on purpose: a missing key disables the
 * feature it belongs to rather than crashing boot, so a fresh clone with a
 * half-filled `.env` still starts and `pnpm build` still passes.
 *
 * Platform runtime vars (`VERCEL_*`, `NODE_ENV`, `PORT`) are deliberately
 * excluded — they describe where the process runs, not how the app is
 * configured, and stay raw at the single site that reads them. Database
 * credentials likewise live in `packages/db`, because the database is not an
 * optional feature and must not silently default to a broken client.
 *
 * Every key added here must also be listed in `turbo.json` `globalEnv`; turbo
 * runs in strict env mode and strips anything unlisted from task environments.
 */
const envSchema = z.object({
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  /**
   * Read implicitly by the `ai` package's gateway provider — no source file
   * references it directly. Declared here so callers that need embeddings can
   * check for it and report something legible instead of a gateway 401.
   */
  AI_GATEWAY_API_KEY: z.string().optional(),
  /**
   * Dev-only. Points GitHub sign-in at a local `emulate` OAuth server so the
   * flow can be exercised offline (see `emulate.config.yaml`). Unset in
   * production, where the real GitHub provider is used.
   */
  NEXT_PUBLIC_GITHUB_EMULATOR_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
