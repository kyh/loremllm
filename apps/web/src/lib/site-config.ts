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
 * The home page's og:video: the ASCII wordmark scrambling into place, the tagline
 * typing on, a hold, then a scramble back out (`scripts/og-video/scene.html`, not
 * part of the app). Recorded frame by frame by `scripts/og-video.ts`
 * (`pnpm -F @loremllm/web og:video`); after a re-record, update `uploadDate` (and
 * `duration` if the scene's length changed).
 */
export const ogVideo = {
  description: `The ${siteConfig.name} ASCII wordmark scrambles into place and the tagline "${siteConfig.description}" types on beneath it.`,
  duration: "PT7S",
  height: 630,
  name: `${siteConfig.name} wordmark`,
  poster: `${url}/og/og-poster.jpg`,
  type: "video/mp4",
  uploadDate: "2026-10-24",
  url: `${url}/og/og.mp4`,
  width: 1200,
};
