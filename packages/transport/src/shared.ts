export type MaybePromise<T> = T | Promise<T>;

/**
 * Delay between chunk emissions to simulate streaming.
 * Accepts:
 * - A number for constant delay
 * - A tuple [min, max] for random delay between values
 * - A function that returns a delay (or tuple) per chunk
 */
export type DelayResolver<CHUNK> =
  | number
  | [number, number]
  | ((chunk: CHUNK) => MaybePromise<number | [number, number] | undefined>);

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Resolves a {@link DelayResolver} to a concrete millisecond delay for one chunk.
 * Returns `undefined` when no delay should be applied.
 */
export async function resolveChunkDelay<CHUNK>(
  resolver: DelayResolver<CHUNK> | undefined,
  chunk: CHUNK,
): Promise<number | undefined> {
  if (resolver == null) {
    return undefined;
  }

  if (typeof resolver === "number") {
    return resolver;
  }

  if (Array.isArray(resolver)) {
    return randomDelay(resolver[0], resolver[1]);
  }

  const result = await resolver(chunk);
  if (result == null) {
    return undefined;
  }

  return Array.isArray(result) ? randomDelay(result[0], result[1]) : result;
}

/**
 * Splits text into streamable segments.
 * - `false`: the entire text as a single segment
 * - `true`: word-by-word (words and whitespace runs)
 * - `RegExp`: a custom pattern — with capturing groups it matches content,
 *   without it splits on the pattern while preserving separators
 */
export function segmentText(text: string, autoChunk: boolean | RegExp): string[] {
  if (text.length === 0) {
    return [];
  }

  if (autoChunk === false) {
    return [text];
  }

  const matchPattern =
    autoChunk === true
      ? /(\S+|\s+)/g // Default: word-by-word (words and spaces)
      : autoChunk.global
        ? autoChunk
        : new RegExp(autoChunk.source, autoChunk.flags + "g");

  // Check if regex has capturing groups (matches content) vs separators (splits on)
  const hasCapturingGroups = matchPattern.source.includes("(");

  const segments: string[] = [];
  if (hasCapturingGroups) {
    // Match content pattern (e.g., /(\S+|\s+)/g)
    for (const match of text.matchAll(matchPattern)) {
      if (match[0].length > 0) {
        segments.push(match[0]);
      }
    }
  } else {
    // Split pattern (e.g., /[,.]/g) - add capturing group to preserve separators
    const splitPattern = new RegExp(`(${matchPattern.source})`, matchPattern.flags);
    for (const segment of text.split(splitPattern)) {
      if (segment.length > 0) {
        segments.push(segment);
      }
    }
  }

  return segments;
}
