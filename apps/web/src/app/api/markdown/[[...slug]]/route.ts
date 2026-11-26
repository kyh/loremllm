import { MARKDOWN_CONTENT_TYPE } from "@/lib/agent/accept";
import {
  renderHomeMarkdown,
  renderNotFoundMarkdown,
  renderProsePageMarkdown,
} from "@/lib/agent/markdown";
import { findPageByPath } from "@/lib/agent/site-pages";
import { getLLMText, source } from "@/lib/source";

interface MarkdownParams {
  params: Promise<{ slug?: string[] }>;
}

const buildBody = async (segments: string[]) => {
  if (segments.length === 0) {
    return { body: renderHomeMarkdown(), status: 200 };
  }

  if (segments[0] === "docs") {
    const docsPage = source.getPage(segments.slice(1));

    if (docsPage) {
      return { body: await getLLMText(docsPage), status: 200 };
    }
  }

  const pathname = `/${segments.join("/")}`;
  const page = findPageByPath(pathname);

  if (page) {
    return { body: renderProsePageMarkdown(page), status: 200 };
  }

  return { body: renderNotFoundMarkdown(pathname), status: 404 };
};

export const GET = async (_request: Request, { params }: MarkdownParams) => {
  const { slug = [] } = await params;
  const { body, status } = await buildBody(slug);

  return new Response(body, {
    headers: {
      "Cache-Control":
        status === 200
          ? "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
          : "no-store",
      "Content-Type": MARKDOWN_CONTENT_TYPE,
      Vary: "Accept",
    },
    status,
  });
};
