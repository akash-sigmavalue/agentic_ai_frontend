import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.1.76'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.cache = false; // Disable webpack cache for frontend
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // Keep inactive pages in memory for 60s
    pagesBufferLength: 5,
  },
};

export default nextConfig;