export type SecurityHeader = {
  key: string;
  value: string;
};

/**
 * Headers applied to every HTML/document response.
 * CSP is omitted here: keep document headers portable across hosts.
 * See docs/DEPLOYMENT.md if a production CSP allowlist is added later.
 */
export const documentSecurityHeaders: SecurityHeader[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

export const privateApiCacheHeaders: SecurityHeader[] = [
  { key: "Cache-Control", value: "private, no-store" },
];

export const PUBLIC_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";
