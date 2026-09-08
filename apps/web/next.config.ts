import type { NextConfig } from "next";

type ImageConfig = NonNullable<NextConfig["images"]>;
type RemotePatterns = NonNullable<ImageConfig["remotePatterns"]>;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const getRemotePatterns = (): RemotePatterns => {
  const remotePatterns: RemotePatterns = [];

  if (!IS_PRODUCTION) {
    remotePatterns.push(
      {
        hostname: "127.0.0.1",
        protocol: "http",
      },
      {
        hostname: "localhost",
        protocol: "http",
      },
    );
  }

  return remotePatterns;
};

const transpilePackages = ["@loremllm/transport", "@repo/api", "@repo/db", "@repo/ui"];

const config: NextConfig = {
  // next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files
  agentRules: false,
  images: {
    remotePatterns: getRemotePatterns(),
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  reactStrictMode: true,
  transpilePackages,
};

export default config;
