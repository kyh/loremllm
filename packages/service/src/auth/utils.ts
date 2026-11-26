import { z } from "zod";

/** NFKD preserves ASCII base letters. Names without one yield an empty slug; callers supply a fallback. */
export const slugify = (str: string) =>
  str
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/gu, "")
    .replaceAll(/\s+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

/** Base slug for organizations whose name slugifies to "" — see `slugify`. */
export const FALLBACK_ORGANIZATION_SLUG = "workspace";

const jsonValue = z.json();

export const zJsonString = z
  .string()
  .transform((str, ctx) => {
    try {
      const parsed: unknown = JSON.parse(str);

      return parsed;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid JSON" });

      return z.NEVER;
    }
  })
  .pipe(jsonValue);
