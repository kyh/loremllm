const url =
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.loremllm.com";

export const siteConfig = {
  author: {
    name: "Kaiyu Hsu",
    url: "https://kyh.io",
  },
  description: "Mock responses for LLMs",
  email: "kai@kyh.io",
  name: "LoremLLM",
  npmPackage: "https://www.npmjs.com/package/@loremllm/transport",
  repository: "https://github.com/kyh/loremllm",
  /** Profiles that resolve to the same entity, for `Organization.sameAs`. */
  sameAs: [
    "https://github.com/kyh/loremllm",
    "https://www.npmjs.com/package/@loremllm/transport",
    "https://x.com/kaiyuhsu",
  ],
  shortName: "LoremLLM",
  twitter: "@kaiyuhsu",
  url,
};

export const ogImage = {
  alt: `${siteConfig.name} — ${siteConfig.description}`,
  height: 1080,
  url: `${url}/og.jpg`,
  width: 1920,
};

/**
 * The home page's og:video: a pared-down chat panel (`scripts/og-video/scene.html`,
 * not part of the app) where a prompt is typed, a reasoning part streams and
 * collapses and a mocked answer streams in, then the wordmark. Recorded frame by
 * frame by `scripts/og-video.ts` (`pnpm -F @loremllm/web og:video`); after a
 * re-record, update `uploadDate` (and `duration` if the scene's length changed).
 */
export const ogVideo = {
  description: `A prompt is typed into a ${siteConfig.name} chat, a reasoning part streams and collapses, and a mocked answer streams in token by token.`,
  duration: "PT10S",
  height: 630,
  name: `${siteConfig.name}: a mocked chat, streamed`,
  poster: `${url}/og/og-poster.jpg`,
  type: "video/mp4",
  uploadDate: "2026-10-24",
  url: `${url}/og/og.mp4`,
  width: 1200,
};
