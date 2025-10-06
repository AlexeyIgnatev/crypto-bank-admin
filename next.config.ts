import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { key: "Access-Control-Allow-Headers", value: "X-Requested-With, Content-Type, Authorization" },
        { key: "X-Frame-Options", value: "ALLOWALL" },
        { key: "Content-Security-Policy", value: "frame-ancestors *" },
      ],
    },
  ],
  eslint: {
    // Не блокировать production build из-за ошибок ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Не блокировать production build из-за ошибок типов TypeScript
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
