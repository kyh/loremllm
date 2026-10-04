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

/**
 * Parses a JSON string, then validates the result is JSON-shaped. Pipe it into
 * a concrete schema to get a typed value:
 *
 * ```ts
 * const authMetadataSchema = zJsonString.pipe(z.object({ personal: z.boolean() }));
 * authMetadataSchema.parse('{"personal": true}'); // { personal: true }
 * ```
 */
const jsonValue = z.json();

export const zJsonString = z
  .string()
  .transform((str, ctx): z.infer<typeof jsonValue> => {
    try {
      return JSON.parse(str);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid JSON" });
      return z.NEVER;
    }
  })
  .pipe(jsonValue);
