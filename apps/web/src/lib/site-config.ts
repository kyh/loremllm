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
