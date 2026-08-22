export const AUTH_REQUIRED_ERROR = "AUTH_REQUIRED";
export const DATABASE_UNAVAILABLE_ERROR = "DATABASE_UNAVAILABLE";

export function isAuthRequiredError(error: unknown): boolean {
  return error instanceof Error && error.message === AUTH_REQUIRED_ERROR;
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  return error instanceof Error && error.message === DATABASE_UNAVAILABLE_ERROR;
}

export function isNextControlFlowError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return false;
  }
  const digest = String((error as { digest?: unknown }).digest);
  return digest.includes("NEXT_REDIRECT") || digest.includes("NEXT_NOT_FOUND");
}
