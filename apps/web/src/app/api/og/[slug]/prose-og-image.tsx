import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { absoluteUrl } from "@/lib/agent/markdown";
import { siteConfig } from "@/lib/site-config";

import type { ProsePage } from "@/lib/agent/site-pages";

/**
 * The per-page Open Graph card `/api/og/<slug>` serves:
 * the site's ASCII wordmark (the same art as `@repo/ui/components/logo`), the
 * page's heading and description, in the dark theme's colours and Geist Mono.
 * The fonts are read from `geist` on disk (traced into the route).
 */

export const proseOgImageSize = { height: 630, width: 1200 };

const WORDMARK = [
  "    __                              __    __    __  ___",
  "   / /   ____  ________  ____ ___  / /   / /   /  |/  /",
  "  / /   / __ \\/ ___/ _ \\/ __ `__ \\/ /   / /   / /|_/ / ",
  " / /___/ /_/ / /  /  __/ / / / / / /___/ /___/ /  / /  ",
  "/_____/\\____/_/   \\___/_/ /_/ /_/_____/_____/_/  /_/",
].join("\n");

const FONT_DIR = path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-mono");

/** The dark theme's tokens (`packages/ui` and `apps/web` globals.css), as sRGB. */
const colors = {
  background: "#09090b",
  border: "#27272a",
  foreground: "#fafafa",
  heading: "#5b6b85",
  muted: "#a1a1aa",
};

export const renderProseOgImage = async (page: ProsePage) => {
  const [regular, bold] = await Promise.all([
    readFile(path.join(FONT_DIR, "GeistMono-Regular.ttf")),
    readFile(path.join(FONT_DIR, "GeistMono-SemiBold.ttf")),
  ]);
  const url = absoluteUrl(page.path).replace(/^https?:\/\//u, "");

  return new ImageResponse(
    <div
      style={{
        background: colors.background,
        color: colors.foreground,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Geist Mono",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px",
        width: "100%",
      }}
    >
      <div style={{ fontSize: 17, lineHeight: 1.2, whiteSpace: "pre" }}>{WORDMARK}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ color: colors.heading, fontSize: 24, textTransform: "uppercase" }}>
          {page.title}
        </div>
        <div style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.1 }}>{page.heading}</div>
        <div style={{ color: colors.muted, fontSize: 28, lineHeight: 1.4, maxWidth: 1000 }}>
          {page.description}
        </div>
      </div>
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          color: colors.muted,
          display: "flex",
          fontSize: 22,
          justifyContent: "space-between",
          paddingTop: 24,
        }}
      >
        <span>{url}</span>
        <span>{siteConfig.description}</span>
      </div>
    </div>,
    {
      ...proseOgImageSize,
      fonts: [
        { data: regular, name: "Geist Mono", style: "normal", weight: 400 },
        { data: bold, name: "Geist Mono", style: "normal", weight: 600 },
      ],
      // Copy only changes on deploy, so the CDN keeps a card for a day and serves it stale for a week.
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
};
