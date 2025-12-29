import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Force webpack usage and configure module resolution
  webpack: (config, { isServer }) => {
    // Configure path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    
    // Configure fallbacks for Node.js modules
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      ...config.resolve.fallback,
    };
    
    // Ensure proper extension resolution
    if (!config.resolve.extensions) {
      config.resolve.extensions = [];
    }
    config.resolve.extensions.push('.tsx', '.ts', '.jsx', '.js', '.json');
    
    // Make module resolution more lenient
    config.resolve.symlinks = false;
    
    return config;
  },
};

export default nextConfig;
