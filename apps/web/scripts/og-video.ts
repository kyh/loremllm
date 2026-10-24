/**
 * Records the og:video: tokens streaming into the real chat UI on the home page.
 *
 * Run against a running app (`pnpm dev:web`, or `next start`):
 *
 *   pnpm -F @loremllm/web og:video                       # http://localhost:3000
 *   OG_VIDEO_URL=http://localhost:3017 pnpm -F @loremllm/web og:video
 *
 * It opens the "Reasoning Stream" demo (a `StaticChatTransport`, so no database
 * or API key is needed), types a prompt and lets the answer stream in. Frames come
 * from Chrome's screencast, timed by their own timestamps, and ffmpeg encodes
 * them to `public/og/og.mp4` (H.264, 1200x630, no audio, crossfaded so it loops)
 * plus the poster `public/og/og-poster.jpg`. Needs ffmpeg on PATH and Playwright's
 * Chromium (`pnpm -F @loremllm/web exec playwright install chromium`, once).
 * Not part of `pnpm verify` or the build.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "playwright";

const WIDTH = 1200;
const HEIGHT = 630;
const FPS = 30;
/** Crossfade from the clip's end back into its start, so the loop has no seam. */
const LOOP_FADE_SECONDS = 0.6;
/** og:video wants 6–10s; a slow machine types slower, so the clip's start is cut to fit. */
const MAX_SECONDS = 9.8;
const PROMPT = "How do I mock a streaming LLM response?";

const baseUrl = process.env.OG_VIDEO_URL ?? "http://localhost:3000";
const outDir = path.resolve(import.meta.dirname, "../public/og");
const workDir = mkdtempSync(path.join(tmpdir(), "loremllm-og-"));

interface Frame {
  file: string;
  timestamp: number;
}

const frames: Frame[] = [];

const record = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    colorScheme: "dark",
    reducedMotion: "no-preference",
    viewport: { height: HEIGHT, width: WIDTH },
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  // The dev server's overlay badge is not part of the product.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

  // Open the demo: a draggable panel over the demo list, as a visitor sees it.
  await page.getByText("Reasoning Stream", { exact: true }).first().click();
  await page.getByText("[AI SDK Transport] Reasoning Stream").waitFor();
  await page.mouse.move(WIDTH - 40, HEIGHT - 120);
  await sleep(600);

  const cdp = await page.context().newCDPSession(page);
  cdp.on("Page.screencastFrame", (event) => {
    const file = path.join(workDir, `${frames.length.toString().padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(event.data, "base64"));
    frames.push({ file, timestamp: event.metadata.timestamp ?? Date.now() / 1000 });
    void cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId });
  });
  await cdp.send("Page.startScreencast", {
    everyNthFrame: 1,
    format: "jpeg",
    maxHeight: HEIGHT,
    maxWidth: WIDTH,
    quality: 92,
  });

  await sleep(700);
  const input = page.getByPlaceholder("Type your message...");
  await input.click();
  await input.pressSequentially(PROMPT, { delay: 38 });
  await sleep(250);
  await input.press("Enter");
  // The transport streams the reasoning part, then the answer.
  await page.getByText("that you can toggle above.").waitFor({ timeout: 15_000 });
  await sleep(1800);

  await cdp.send("Page.stopScreencast");
  await browser.close();
};

const encode = () => {
  if (frames.length < 2) {
    throw new Error(`Only ${frames.length} screencast frames were captured`);
  }
  // Each frame lasts until the next one arrived; the last holds a beat.
  const lines: string[] = [];
  let total = 0;
  for (const [index, frame] of frames.entries()) {
    const next = frames[index + 1];
    const duration = next ? next.timestamp - frame.timestamp : 0.5;
    total += duration;
    lines.push(`file '${frame.file}'`, `duration ${duration.toFixed(4)}`);
  }
  const lastFrame = frames.at(-1);
  if (lastFrame) {
    lines.push(`file '${lastFrame.file}'`);
  }
  const listFile = path.join(workDir, "frames.txt");
  writeFileSync(listFile, `${lines.join("\n")}\n`);

  // The clip runs from `start` to the end, then dissolves into the frames just before
  // `start`, so its last frame is the one it opens on.
  const start = Math.max(LOOP_FADE_SECONDS, total - MAX_SECONDS);
  const length = total - start;
  const fadeOffset = (length - LOOP_FADE_SECONDS).toFixed(3);

  mkdirSync(outDir, { recursive: true });
  const video = path.join(outDir, "og.mp4");
  const filter = [
    `[0:v]fps=${FPS},scale=${WIDTH}:${HEIGHT},setsar=1,format=yuv420p,split[a][b]`,
    `[a]trim=start=${start.toFixed(3)},setpts=PTS-STARTPTS[body]`,
    `[b]trim=start=${(start - LOOP_FADE_SECONDS).toFixed(3)}:duration=${LOOP_FADE_SECONDS},setpts=PTS-STARTPTS[head]`,
    `[body][head]xfade=transition=fade:duration=${LOOP_FADE_SECONDS}:offset=${fadeOffset}[out]`,
  ].join(";");
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFile,
      "-filter_complex",
      filter,
      "-map",
      "[out]",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "high",
      "-crf",
      "28",
      "-r",
      String(FPS),
      "-movflags",
      "+faststart",
      video,
    ],
    { stdio: "inherit" },
  );

  // The poster is the finished answer: the frame just before the loop fades out.
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-ss",
      (length - LOOP_FADE_SECONDS - 0.2).toFixed(3),
      "-i",
      video,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      path.join(outDir, "og-poster.jpg"),
    ],
    { stdio: "inherit" },
  );
  console.log(`Wrote ${video} (${length.toFixed(1)}s, ${frames.length} frames)`);
};

try {
  await record();
  encode();
} finally {
  rmSync(workDir, { force: true, recursive: true });
}
