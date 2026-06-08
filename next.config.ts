import type { NextConfig } from "next";

// Next.js reverts custom `devtool` in dev; replace its eval source-map plugin so pdfjs-dist is excluded.
// See: https://github.com/vercel/next.js/issues/89177
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { webpack } = require("next/dist/compiled/webpack/webpack");

const PDFJS_EXCLUDE = [/node_modules[\\/]pdfjs-dist/, /node_modules[\\/]react-pdf/];

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
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    
    const plugin = config.plugins.find(
      (p: any) => p?.constructor?.name === "EvalSourceMapDevToolPlugin"
    );
    if (plugin) {
      const currentExclude = plugin.options.exclude || [];
      plugin.options.exclude = [
        ...(Array.isArray(currentExclude) ? currentExclude : [currentExclude]),
        ...PDFJS_EXCLUDE,
      ].filter(Boolean);
    }
    
    return config;
  },
};

export default nextConfig;