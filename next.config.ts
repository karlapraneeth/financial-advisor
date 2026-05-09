import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse bundles its own PDF.js and can't be webpack-compiled by Next.js.
  // Listing it here tells Next.js to require() it at runtime instead of bundling.
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
