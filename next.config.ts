import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp" as const],
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: "*.r2.dev",
      },
    ],
  },
};

export default nextConfig;
