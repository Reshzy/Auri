import "server-only";

import { requireAuthenticatedUser } from "@/db/dal/auth-user";

/**
 * Authenticated app entry helper: validate Clerk session and ensure a profiles row.
 */
export async function getAppUser() {
  return requireAuthenticatedUser();
}
