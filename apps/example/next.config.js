/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  /** The mock API lives in the main app, so we ignore lint/type errors during builds here. */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default config;
