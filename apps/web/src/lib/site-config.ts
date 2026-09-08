export const siteConfig = {
  description: "Mock responses for LLMs",
  name: "LoremLLM",
  shortName: "LoremLLM",
  twitter: "@kaiyuhsu",
  url: process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://loremllm.com",
};
