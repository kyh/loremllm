import { z } from "zod";

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

export const sleep = async (ms: number) => {
  // oxlint-disable-next-line promise/avoid-new -- a timer has no promise form
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const toolPartSchema = z.object({
  errorText: z.string().optional().catch(undefined),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  providerMetadata: z
    .record(z.string(), z.record(z.string(), z.json()))
    .optional()
    .catch(undefined),
  state: z.string().optional().catch(undefined),
  toolCallId: z.string(),
  toolName: z.string().optional().catch(undefined),
  type: z.string(),
});

export type ToolLikePart = z.infer<typeof toolPartSchema>;

/**
 * Reads the fields both transports stream from a `tool-*` or `dynamic-tool`
 * part, whichever of the AI SDK's tool part shapes (or a `SpecialToolPart`) it arrived as.
 */
export const parseToolPart = (part: { type: string }) => {
  const parsed = toolPartSchema.safeParse(part);

  if (!parsed.success) {
    throw new Error(`A "${part.type}" part needs a string \`toolCallId\`.`);
  }

  return parsed.data;
};

type Visit<ITEM> = (item: ITEM) => Promise<"next" | "stop">;

const visitRest: <ITEM>(iterator: Iterator<ITEM>, visit: Visit<ITEM>) => Promise<void> = async (
  iterator,
  visit,
) => {
  const next = iterator.next();

  if (next.done === true) {
    return;
  }

  if ((await visit(next.value)) === "next") {
    await visitRest(iterator, visit);
  }
};

/**
 * Visits `items` one at a time, awaiting each visit before starting the next,
 * until a visit answers `"stop"`.
 */
export const eachInOrder = async <ITEM>(items: Iterable<ITEM>, visit: Visit<ITEM>) => {
  await visitRest(items[Symbol.iterator](), visit);
};

const randomDelay = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const isDelayFunction = <CHUNK>(resolver: DelayResolver<CHUNK>): resolver is DelayFunction<CHUNK> =>
  typeof resolver === "function";

/**
 * Resolves a {@link DelayResolver} to a concrete millisecond delay for one chunk.
 * Returns `null` when no delay should be applied.
 */
export const resolveChunkDelay = async <CHUNK>(
  resolver: DelayResolver<CHUNK> | undefined,
  chunk: CHUNK,
) => {
  if (resolver === undefined) {
    return null;
  }

  if (Array.isArray(resolver)) {
    return randomDelay(resolver[0], resolver[1]);
  }

  if (isDelayFunction(resolver)) {
    const result = await resolver(chunk);

    if (result === undefined) {
      return null;
    }

    return Array.isArray(result) ? randomDelay(result[0], result[1]) : result;
  }

  return resolver;
};

const toGlobalPattern = (autoChunk: true | RegExp) => {
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
export const segmentText = (text: string, autoChunk: boolean | RegExp) => {
  if (text.length === 0) {
    return [];
  }

  if (autoChunk === false) {
    return [text];
  }

  const matchPattern = toGlobalPattern(autoChunk);

  const hasCapturingGroups = matchPattern.source.includes("(");

  const segments: string[] = [];

  if (hasCapturingGroups) {
    for (const match of text.matchAll(matchPattern)) {
      if (match[0].length > 0) {
        segments.push(match[0]);
      }
    }
  } else {
    const splitPattern = new RegExp(`(${matchPattern.source})`, matchPattern.flags);

    for (const segment of text.split(splitPattern)) {
      if (segment.length > 0) {
        segments.push(segment);
      }
    }
  }

  return segments;
};
