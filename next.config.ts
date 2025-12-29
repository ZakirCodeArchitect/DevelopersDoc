import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Force webpack usage and configure module resolution
  webpack: (config) => {
    // Configure path aliases - use absolute path
    const projectRoot = path.resolve(process.cwd());
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": projectRoot,
    };
    
    // Configure fallbacks for Node.js modules
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false, 
      net: false, 
      tls: false,
    };
    
    return config;
  },
};

export default nextConfig;
