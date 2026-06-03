import type { NextConfig } from "next";

// Next.js reverts custom `devtool` in dev; replace its eval source-map plugin so pdfjs-dist is excluded.
// See: https://github.com/vercel/next.js/issues/89177
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { webpack } = require("next/dist/compiled/webpack/webpack");

const PDFJS_EXCLUDE = [/node_modules[\\/]pdfjs-dist/, /node_modules[\\/]react-pdf/];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.76"],
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.plugins = (config.plugins ?? []).filter(
        (plugin: { constructor?: { name?: string } }) =>
          plugin?.constructor?.name !== "EvalSourceMapDevToolPlugin"
      );
      config.plugins.push(
        new webpack.EvalSourceMapDevToolPlugin({
          moduleFilenameTemplate: config.output?.devtoolModuleFilenameTemplate,
          exclude: PDFJS_EXCLUDE,
          columns: false,
        })
      );
    }

    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    config.module.rules.push({
      test: /pdf\.mjs$/,
      type: "javascript/auto",
    });
    return config;
  },
};

export default nextConfig;
