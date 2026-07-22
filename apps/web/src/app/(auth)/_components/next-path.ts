const DEFAULT_AUTH_PATH = "/dashboard";
// Any absolute origin works here — it exists only so a relative path can be
// parsed, and so anything that escapes to a different origin can be detected.
const AUTH_REDIRECT_ORIGIN = "https://loremllm.invalid";

/**
 * Resolve the post-auth redirect target from the `next` query param.
 *
 * `next` is attacker-controllable and flows into `router.replace`, so only
 * same-origin relative paths survive: the value is re-parsed against a dummy
 * origin and re-serialised, which strips anything that would escape it
 * (protocol-relative `//evil.com`, backslash tricks, embedded credentials).
 *
 * Read server-side in the page and passed to the form as a prop, so the client
 * form needs no `useSearchParams` and therefore no Suspense boundary.
 * Next yields an array for a repeated key; only the first value is considered.
 */
export const safeNextPath = (nextPath?: string | string[]): string => {
  const value = Array.isArray(nextPath) ? nextPath[0] : nextPath;

  if (!value?.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_PATH;
  }

  try {
    const url = new URL(value, AUTH_REDIRECT_ORIGIN);
    if (url.origin !== AUTH_REDIRECT_ORIGIN) {
      return DEFAULT_AUTH_PATH;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_PATH;
  }
};
