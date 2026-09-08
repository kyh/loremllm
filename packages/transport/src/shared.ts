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

type DelayFunction<CHUNK> = Exclude<DelayResolver<CHUNK>, number | [number, number]>;

export const sleep = (ms: number): Promise<void> =>
  // oxlint-disable-next-line promise/avoid-new -- a timer has no promise form
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const randomDelay = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const isDelayFunction = <CHUNK>(resolver: DelayResolver<CHUNK>): resolver is DelayFunction<CHUNK> =>
  typeof resolver === "function";

/**
 * Resolves a {@link DelayResolver} to a concrete millisecond delay for one chunk.
 * Returns `undefined` when no delay should be applied.
 */
export const resolveChunkDelay = async <CHUNK>(
  resolver: DelayResolver<CHUNK> | undefined,
  chunk: CHUNK,
): Promise<number | undefined> => {
  if (resolver === undefined) {
    return undefined;
  }

  if (Array.isArray(resolver)) {
    return randomDelay(resolver[0], resolver[1]);
  }

  if (isDelayFunction(resolver)) {
    const result = await resolver(chunk);
    if (result === undefined) {
      return undefined;
    }

    return Array.isArray(result) ? randomDelay(result[0], result[1]) : result;
  }

  return resolver;
};

const toGlobalPattern = (autoChunk: true | RegExp): RegExp => {
  if (autoChunk === true) {
    return /(?<word>\S+|\s+)/gu;
  }
  return autoChunk.global ? autoChunk : new RegExp(autoChunk.source, `${autoChunk.flags}g`);
};

/**
 * Splits text into streamable segments.
 * - `false`: the entire text as a single segment
 * - `true`: word-by-word (words and whitespace runs)
 * - `RegExp`: a custom pattern — with capturing groups it matches content,
 *   without it splits on the pattern while preserving separators
 */
export const segmentText = (text: string, autoChunk: boolean | RegExp): string[] => {
  if (text.length === 0) {
    return [];
  }

  if (autoChunk === false) {
    return [text];
  }

  const matchPattern = toGlobalPattern(autoChunk);

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
};
