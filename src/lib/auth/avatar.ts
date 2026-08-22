/**
 * Display-only avatar URL from Auth JWT claims.
 * Never use user_metadata for authorization.
 */
export function avatarUrlFromAuthClaims(claims: unknown): string | null {
  if (!isRecord(claims)) {
    return null;
  }
  return avatarUrlFromUserMetadata(claims.user_metadata);
}

export function avatarUrlFromUserMetadata(metadata: unknown): string | null {
  if (!isRecord(metadata)) {
    return null;
  }
  return httpsAvatarUrl(metadata.avatar_url) ?? httpsAvatarUrl(metadata.picture);
}

function httpsAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
