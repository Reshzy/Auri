/** User-scoped generation limit: new persisted files per rolling window. */
export const EXPORT_RATE_LIMIT_WINDOW_MS = 60_000;
export const EXPORT_RATE_LIMIT_MAX = 12;

export function isRateLimited(recentCount: number, max = EXPORT_RATE_LIMIT_MAX): boolean {
  return recentCount >= max;
}
