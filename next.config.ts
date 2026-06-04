import type { NextConfig } from "next";

// Next.js reverts custom `devtool` in dev; replace its eval source-map plugin so pdfjs-dist is excluded.
// See: https://github.com/vercel/next.js/issues/89177
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { webpack } = require("next/dist/compiled/webpack/webpack");

const PDFJS_EXCLUDE = [/node_modules[\\/]pdfjs-dist/, /node_modules[\\/]react-pdf/];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;