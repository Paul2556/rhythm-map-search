import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Lets the Electron build bundle a minimal self-contained server instead of
  // shipping the whole node_modules tree.
  output: "standalone",
};

export default nextConfig;
