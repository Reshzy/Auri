/**
 * Explicitly rejects client-supplied owner ids that differ from the session user.
 * Pure helper — safe to unit test without a database.
 */
export function assertOwnerMatchesSession(
  sessionUserId: string,
  clientSuppliedOwnerId: unknown,
): void {
  if (clientSuppliedOwnerId === undefined || clientSuppliedOwnerId === null) {
    return;
  }
  if (typeof clientSuppliedOwnerId !== "string") {
    throw new Error("Client-supplied owner id is not allowed.");
  }
  if (clientSuppliedOwnerId !== sessionUserId) {
    throw new Error("Client-supplied owner id is not allowed.");
  }
}
