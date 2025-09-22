import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mock LLM Chat Example",
  description: "Playground UI that streams from the mock /api/chat endpoint.",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
