import { z } from "zod";

/**
 * Converts a string to a URL-friendly slug
 * Removes special characters, converts to lowercase, and replaces spaces with hyphens
 * @param str - The input string to convert to a slug
 * @returns string - A URL-friendly slug
 */
export const slugify = (str: string) => {
  str = str.replace(/^\s+|\s+$/g, ""); // Trim leading/trailing whitespace
  str = str.toLowerCase(); // Convert to lowercase

  // Remove invalid characters, replace spaces and multiple hyphens with a single hyphen
  str = str
    .replace(/[^a-z0-9 -]/g, "") // Remove invalid chars
    .replace(/\s+/g, "-") // Replace spaces with a single hyphen
    .replace(/-+/g, "-"); // Collapse multiple hyphens

  return str;
};

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
export const zJsonString = z
  .string()
  .transform((str, ctx): unknown => {
    try {
      return JSON.parse(str);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid JSON" });
      return z.NEVER;
    }
  })
  .pipe(z.json());
