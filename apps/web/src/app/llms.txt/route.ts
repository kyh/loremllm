import { MARKDOWN_CONTENT_TYPE } from "@/lib/agent/accept";
import { renderLlmsTxt } from "@/lib/agent/llms-txt";
import { source } from "@/lib/source";

export const GET = () =>
  new Response(
    renderLlmsTxt(
      source.getPages().map((page) => ({
        href: `${page.url}.md`,
        label: page.data.title,
        text: page.data.description,
      })),
    ),
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": MARKDOWN_CONTENT_TYPE,
      },
    },
  );
