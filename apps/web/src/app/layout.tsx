import type { Metadata, Viewport } from "next";
import { GlobalAlertDialog } from "@repo/ui/components/alert-dialog";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@repo/ui/components/sonner";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import { cn } from "cn";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";

import { ogImage, siteConfig } from "@/lib/site-config";
import { ORPCReactProvider } from "@/orpc/react";

import "./styles/globals.css";

const inter = localFont({
  src: [
    { path: "./fonts/Inter-Regular.woff2", style: "normal", weight: "400" },
    { path: "./fonts/Inter-Medium.woff2", style: "normal", weight: "500" },
  ],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  description: siteConfig.description,
  icons: [
    {
      rel: "icon",
      sizes: "96x96",
      type: "image/png",
      url: `${siteConfig.url}/favicon/favicon-96x96.png`,
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      url: `${siteConfig.url}/favicon/favicon.svg`,
    },
    {
      rel: "shortcut icon",
      url: `${siteConfig.url}/favicon/favicon.ico`,
    },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: `${siteConfig.url}/favicon/apple-touch-icon.png`,
    },
    {
      rel: "manifest",
      url: `${siteConfig.url}/favicon/site.webmanifest`,
    },
  ],
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    description: siteConfig.description,
    images: [ogImage],
    locale: "en-US",
    siteName: siteConfig.name,
    title: siteConfig.name,
    type: "website",
    url: siteConfig.url,
  },
  other: {
    "apple-mobile-web-app-title": siteConfig.shortName,
  },
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  twitter: {
    card: "summary_large_image",
    creator: siteConfig.twitter,
    description: siteConfig.description,
    images: [ogImage],
    title: siteConfig.name,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#17181b",
};

interface LayoutProps {
  children: React.ReactNode;
}

const RootLayout = (props: LayoutProps) => (
  <html lang="en" className="dark" suppressHydrationWarning>
    <body
      className={cn(
        inter.variable,
        GeistMono.variable,
        "text-foreground bg-background selection:bg-foreground selection:text-background font-sans antialiased",
      )}
    >
      <ThemeProvider forcedTheme="dark" defaultTheme="dark" enableSystem={false}>
        <TooltipProvider>
          <ORPCReactProvider>{props.children}</ORPCReactProvider>
          <Toaster />
          <GlobalAlertDialog />
        </TooltipProvider>
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
