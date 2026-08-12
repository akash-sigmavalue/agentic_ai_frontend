import type { NextConfig } from "next";

// Next.js reverts custom `devtool` in dev; we patch EvalSourceMapDevToolPlugin to exclude
// files that are too large for it to handle — otherwise it crashes with:
//   "RangeError: Array buffer allocation failed"
// See: https://github.com/vercel/next.js/issues/89177
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { webpack } = require("next/dist/compiled/webpack/webpack");

/** Patterns excluded from eval source-map generation in dev.
 *  EvalSourceMapDevToolPlugin allocates a TypedArray sized to each file's
 *  character count — files > ~500 KB cause "Array buffer allocation failed". */
const SOURCEMAP_EXCLUDE = [
  /node_modules[\\/]pdfjs-dist/,
  /node_modules[\\/]react-pdf/,
  // ChatSectionNext is ~570 KB and reliably triggers the ArrayBuffer crash
  /components[\\/]valuation[\\/]agent-one[\\/]ChatSectionNext/,
];

const nextConfig: NextConfig = {
  experimental: {
    proxyTimeout: 180000, // 3 minutes in milliseconds (default is ~30-60s)
  },
  async rewrites() {
    return [
      {
        source: '/new_rate_simulator/simulator/:path*',
        destination: 'http://localhost:8000/new_rate_simulator/simulator/:path*',
      },
      {
        source: '/simulator/:path*',
        destination: 'http://localhost:8000/simulator/:path*',
      },
      {
        source: '/geospatial/:path*',
        destination: 'http://localhost:8000/geospatial/:path*',
      },
      {
        source: '/data_db/:path*',
        destination: 'http://localhost:8000/data_db/:path*',
      },
    ];
  },
  allowedDevOrigins: ['192.168.1.76'],
  typescript: {
    ignoreBuildErrors: true,
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // Keep inactive pages in memory for 60s
    pagesBufferLength: 5,
  },
  // Single merged webpack callback — the original config had two `webpack` keys;
  // JS object literals silently drop all but the last, so the cache = false
  // and alias fixes were never applied simultaneously. Fixed here.
  webpack: (config, { isServer }) => {
    // Disable webpack cache for client builds to avoid stale chunks
    if (!isServer) {
      config.cache = false;
    }

    // PDF.js needs these aliases to avoid canvas/encoding imports
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Patch EvalSourceMapDevToolPlugin to skip files that are too large to source-map
    const plugin = config.plugins.find(
      (p: any) => p?.constructor?.name === "EvalSourceMapDevToolPlugin"
    );
    if (plugin) {
      const currentExclude = plugin.options.exclude || [];
      plugin.options.exclude = [
        ...(Array.isArray(currentExclude) ? currentExclude : [currentExclude]),
        ...SOURCEMAP_EXCLUDE,
      ].filter(Boolean);
    }

    return config;
  },
};

export default nextConfig;