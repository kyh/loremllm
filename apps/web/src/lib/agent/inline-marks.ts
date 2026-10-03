/**
 * The inline markup prose copy may carry, and nothing more: `code`, **strong**
 * and [links](href). Parsed in one place so the JSX page and its Markdown twin
 * read the same marks. Marks do not nest: the text inside one is plain.
 */
export type InlineMark =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; text: string }
  | { href: string; kind: "link"; text: string };

const INLINE_MARK =
  /`(?<code>[^`]+)`|\*\*(?<strong>.+?)\*\*|\[(?<label>[^\]]+)\]\((?<href>[^)\s]+)\)/gu;

const markOf = (match: RegExpExecArray): InlineMark => {
  const { code, strong, label, href } = match.groups ?? {};
  if (code !== undefined) {
    return { kind: "code", text: code };
  }
  if (strong !== undefined) {
    return { kind: "strong", text: strong };
  }
  if (label !== undefined && href !== undefined) {
    return { href, kind: "link", text: label };
  }
  return { kind: "text", text: match[0] };
};

/** Splits copy into marks. Text that only looks like the start of one stays text. */
export const parseInlineMarks = (text: string): InlineMark[] => {
  const marks: InlineMark[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE_MARK)) {
    if (match.index > cursor) {
      marks.push({ kind: "text", text: text.slice(cursor, match.index) });
    }
    marks.push(markOf(match));
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    marks.push({ kind: "text", text: text.slice(cursor) });
  }
  return marks;
};

const markToMarkdown = (mark: InlineMark, resolveHref: (href: string) => string): string => {
  switch (mark.kind) {
    case "code": {
      return `\`${mark.text}\``;
    }
    case "strong": {
      return `**${mark.text}**`;
    }
    case "link": {
      return `[${mark.text}](${resolveHref(mark.href)})`;
    }
    case "text": {
      return mark.text;
    }
    default: {
      const exhaustive: never = mark;
      return exhaustive;
    }
  }
};

/**
 * Writes copy back out as Markdown. The marks are already Markdown, so the
 * only change is each link's href, passed through `resolveHref`.
 */
export const inlineMarksToMarkdown = (
  text: string,
  resolveHref: (href: string) => string,
): string =>
  parseInlineMarks(text)
    .map((mark) => markToMarkdown(mark, resolveHref))
    .join("");
