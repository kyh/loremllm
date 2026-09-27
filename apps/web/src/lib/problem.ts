import { z } from "zod";

/**
 * RFC 9457 problem details — the error body of every public API route, so an
 * agent can branch on `status` and read `detail` without scraping text.
 */

export const PROBLEM_CONTENT_TYPE = "application/problem+json";

const statusTitles = new Map([
  [400, "Bad Request"],
  [403, "Forbidden"],
  [404, "Not Found"],
  [405, "Method Not Allowed"],
  [500, "Internal Server Error"],
]);

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
}

export const buildProblem = (status: number, detail: string): Problem => ({
  detail,
  status,
  title: statusTitles.get(status) ?? "Error",
  type: "about:blank",
});

export const problemResponse = (status: number, detail: string, headers?: HeadersInit) => {
  const merged = new Headers(headers);
  merged.set("Content-Type", PROBLEM_CONTENT_TYPE);
  return Response.json(buildProblem(status, detail), { headers: merged, status });
};

const problemDetail = z.object({ detail: z.string() });

/**
 * `useChat` surfaces a failed response's raw body as `error.message`; this
 * recovers the human sentence from a problem document and passes any other
 * text through unchanged.
 */
export const readProblemDetail = (message: string): string => {
  try {
    const parsed = problemDetail.safeParse(JSON.parse(message));
    return parsed.success ? parsed.data.detail : message;
  } catch {
    return message;
  }
};
