import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable Turbopack for production builds to avoid module resolution issues
  experimental: {
    turbo: {
      resolveAlias: {
        '@': './',
      },
    },
  },
};

export default nextConfig;
