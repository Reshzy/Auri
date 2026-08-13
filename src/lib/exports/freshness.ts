export type PresentationStatus = "current" | "outdated";

export type FreshnessInput = {
  isCurrentFlag: boolean;
  storedSourceRevision: string;
  expectedSourceRevision: string;
  storagePresent: boolean;
  storageMatchesMetadata: boolean;
};

/**
 * History presentation must not trust is_current alone.
 * Template activation can leave the stored flag stale.
 */
export function derivePresentationStatus(input: FreshnessInput): PresentationStatus {
  if (!input.isCurrentFlag) return "outdated";
  if (!input.storagePresent) return "outdated";
  if (!input.storageMatchesMetadata) return "outdated";
  if (input.storedSourceRevision !== input.expectedSourceRevision) return "outdated";
  return "current";
}

export function isDownloadable(input: {
  storagePresent: boolean;
  storageMatchesMetadata: boolean;
}): boolean {
  return input.storagePresent && input.storageMatchesMetadata;
}
