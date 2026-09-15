import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photos are shrunk in the browser to well under 1 MB before upload.
      // This leaves room for a large original that could not be shrunk,
      // while staying under Vercel's 4.5 MB request limit.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
