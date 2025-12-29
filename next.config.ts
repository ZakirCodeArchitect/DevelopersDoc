import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Use webpack instead of Turbopack for more lenient module resolution
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    config.resolve.fallback = { fs: false, net: false, tls: false };
    // Enable extension resolution for better module resolution
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
    return config;
  },
};

export default nextConfig;
