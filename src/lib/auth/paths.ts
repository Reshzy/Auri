/** Routes that require an authenticated session. */
export function isProtectedPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

/**
 * Auth entry pages that signed-in users should leave.
 * `/reset-password` stays reachable so recovery sessions can set a new password.
 * `/auth/callback` must stay reachable for PKCE exchange.
 */
export function isAuthEntryPath(pathname: string): boolean {
  return (
    pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password"
  );
}

export function safeNextPath(
  candidate: string | null | undefined,
  fallback = "/app",
): string {
  if (!candidate) {
    return fallback;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  return candidate;
}
