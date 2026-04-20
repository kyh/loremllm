const IS_PRODUCTION = process.env.NODE_ENV === "production";

const getRemotePatterns = () => {
  /** @type {import('next').NextConfig['remotePatterns']} */
  const remotePatterns = [];

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

const transpilePackages = ["@repo/api", "@repo/db", "@repo/ui"];

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  transpilePackages,
  images: {
    remotePatterns: getRemotePatterns(),
  },
  typescript: { ignoreBuildErrors: true },
};

export default config;
