import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { Page } from "playwright";
import { chromium } from "playwright";
import { z } from "zod";

const WIDTH = 1200;
const HEIGHT = 630;
const FPS = 30;
const POSTER_SECONDS = 4;

const scene = pathToFileURL(path.resolve(import.meta.dirname, "og-video/scene.html")).href;
const outDir = path.resolve(import.meta.dirname, "../public/og");
const workDir = mkdtempSync(path.join(tmpdir(), "loremllm-og-"));

const frameFile = (index: number) => path.join(workDir, `${index.toString().padStart(5, "0")}.png`);

const renderFrames: (page: Page, index: number, frames: number) => Promise<void> = async (
  page,
  index,
  frames,
) => {
  if (index >= frames) {
    return;
  }

  await page.evaluate(`window.renderAt(${index / FPS})`);
  await page.screenshot({ path: frameFile(index) });
  await renderFrames(page, index + 1, frames);
};

const record = async () => {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport: { height: HEIGHT, width: WIDTH },
    });

    await page.goto(scene);
    await page.evaluate(async () => await document.fonts.ready.then(() => document.fonts.size));

    const duration = z
      .number()
      .positive()
      .parse(await page.evaluate("window.DURATION"));

    const frames = Math.round(duration * FPS);

    await renderFrames(page, 0, frames);

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
