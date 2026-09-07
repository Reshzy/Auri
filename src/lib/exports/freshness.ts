export type PresentationStatus = "current" | "outdated";

export type FreshnessInput = {
  isCurrentFlag: boolean;
  storedSourceRevision: string;
  expectedSourceRevision: string | readonly string[];
  storagePresent: boolean;
  storageMatchesMetadata: boolean;
};

function expectedRevisionMatches(
  stored: string,
  expected: string | readonly string[],
): boolean {
  if (typeof expected === "string") return stored === expected;
  return expected.includes(stored);
}

/**
 * History presentation must not trust is_current alone.
 * Template activation can leave the stored flag stale.
 */
export function derivePresentationStatus(input: FreshnessInput): PresentationStatus {
  if (!input.isCurrentFlag) return "outdated";
  if (!input.storagePresent) return "outdated";
  if (!input.storageMatchesMetadata) return "outdated";
  if (!expectedRevisionMatches(input.storedSourceRevision, input.expectedSourceRevision)) {
    return "outdated";
  }
  return "current";
}

export function isDownloadable(input: {
  storagePresent: boolean;
  storageMatchesMetadata: boolean;
}): boolean {
  return input.storagePresent && input.storageMatchesMetadata;
}
