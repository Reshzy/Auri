import type { NextConfig } from "next";
import {
  documentSecurityHeaders,
  privateApiCacheHeaders,
} from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [...documentSecurityHeaders, ...privateApiCacheHeaders],
      },
      {
        source: "/:path*",
        headers: documentSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
