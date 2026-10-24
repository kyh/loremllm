/**
 * Records the og:video from `scripts/og-video/scene.html`: the LoremLLM ASCII
 * wordmark scrambling into place behind a cursor, the tagline typing on, a hold,
 * then everything scrambling back out to the empty frame, looping.
 *
 *   pnpm -F @loremllm/web og:video
 *
 * The scene is a pure function of time (`window.renderAt(t)`), so each frame is
 * stepped and screenshotted at devicePixelRatio 2, then ffmpeg downscales and
 * encodes them to `public/og/og.mp4` (H.264, 1200x630, 30fps, no audio) plus the
 * poster `public/og/og-poster.jpg`. Needs ffmpeg on PATH and Playwright's Chromium
 * (`pnpm -F @loremllm/web exec playwright install chromium`, once). No server, and
 * not part of `pnpm verify` or the build.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";
import { z } from "zod";

const WIDTH = 1200;
const HEIGHT = 630;
const FPS = 30;
/** The wordmark and tagline in full, mid-hold: the poster frame. */
const POSTER_SECONDS = 4;

const scene = pathToFileURL(path.resolve(import.meta.dirname, "og-video/scene.html")).href;
const outDir = path.resolve(import.meta.dirname, "../public/og");
const workDir = mkdtempSync(path.join(tmpdir(), "loremllm-og-"));

const frameFile = (index: number) => path.join(workDir, `${index.toString().padStart(5, "0")}.png`);

const record = async (): Promise<number> => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport: { height: HEIGHT, width: WIDTH },
    });
    await page.goto(scene);
    await page.evaluate(() => document.fonts.ready.then(() => document.fonts.size));
    // scene.html's recorder API: `DURATION` (the loop, in seconds) and `renderAt(t)`.
    const duration = z
      .number()
      .positive()
      .parse(await page.evaluate("window.DURATION"));
    const frames = Math.round(duration * FPS);
    for (let index = 0; index < frames; index += 1) {
      await page.evaluate(`window.renderAt(${index / FPS})`);
      await page.screenshot({ path: frameFile(index) });
    }
    return duration;
  } finally {
    await browser.close();
  }
};

const encode = (duration: number) => {
  mkdirSync(outDir, { recursive: true });
  const video = path.join(outDir, "og.mp4");
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      String(FPS),
      "-i",
      path.join(workDir, "%05d.png"),
      "-vf",
      `scale=${WIDTH}:${HEIGHT}:flags=lanczos,format=yuv420p`,
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "high",
      "-crf",
      "24",
      "-r",
      String(FPS),
      "-movflags",
      "+faststart",
      video,
    ],
    { stdio: "inherit" },
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      frameFile(Math.round(POSTER_SECONDS * FPS)),
      "-vf",
      `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
      "-q:v",
      "3",
      path.join(outDir, "og-poster.jpg"),
    ],
    { stdio: "inherit" },
  );
  console.log(`Wrote ${video} (${duration}s at ${FPS}fps)`);
};

try {
  encode(await record());
} finally {
  rmSync(workDir, { force: true, recursive: true });
}
