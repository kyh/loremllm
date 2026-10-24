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
 * The home page's og:video: the real chat demo streaming a reply, recorded by
 * `scripts/og-video.ts` (`pnpm -F @loremllm/web og:video`). Re-record after a
 * visible change to the demo, then update `uploadDate` and `duration`.
 */
export const ogVideo = {
  description: `A reply streaming into the ${siteConfig.name} chat demo, token by token, from a mocked transport.`,
  duration: "PT10S",
  height: 630,
  name: `${siteConfig.name} chat demo`,
  poster: `${url}/og/og-poster.jpg`,
  type: "video/mp4",
  uploadDate: "2026-10-24",
  url: `${url}/og/og.mp4`,
  width: 1200,
};
