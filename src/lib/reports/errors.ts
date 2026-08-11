export class AppError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "VALIDATION"
      | "CONFLICT"
      | "NOT_EDITABLE"
      | "NOT_READY"
      | "PRECONDITION",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error && error.message === "AUTH_REQUIRED") {
    return "Authentication required.";
  }
  return fallback;
}
