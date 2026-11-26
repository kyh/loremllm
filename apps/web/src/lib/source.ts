import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";

import { docs } from "@/.source/server";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export type DocsPage = InferPageType<typeof source>;

export const getLLMText = async (page: DocsPage) => {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title}\n\n${page.data.description ?? ""}\n\n${processed}`;
};
