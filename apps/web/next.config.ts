import type { NextConfig } from "next";

type ImageConfig = NonNullable<NextConfig["images"]>;
type RemotePatterns = NonNullable<ImageConfig["remotePatterns"]>;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const getRemotePatterns = (): RemotePatterns => {
  const remotePatterns: RemotePatterns = [];

  if (!IS_PRODUCTION) {
    remotePatterns.push({
      protocol: "http",
      hostname: "127.0.0.1",
    });

    remotePatterns.push({
      protocol: "http",
      hostname: "localhost",
    });
  }

  return remotePatterns;
};

const transpilePackages = ["@loremllm/transport", "@repo/api", "@repo/db", "@repo/ui"];

const config: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  transpilePackages,
  images: {
    remotePatterns: getRemotePatterns(),
  },
};

export default config;
