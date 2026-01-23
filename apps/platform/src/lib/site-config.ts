export const siteConfig = {
  name: "LoremLLM",
  shortName: "LoremLLM",
  description: "Mock APIs for LLMs",
  url:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://loremllm.com",
  twitter: "@kaiyuhsu",
};
