import "server-only";

import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { ensureProfile } from "@/db/dal/profiles";
import { hasDatabaseUrl } from "@/lib/env";

/**
 * Authenticated app entry helper: validate Supabase session, then ensure a profiles row.
 * Profile provisioning is skipped only when DATABASE_URL is unset (auth-only shells).
 */
export async function getAppUser() {
  const user = await requireAuthenticatedUser();

  if (hasDatabaseUrl()) {
    await ensureProfile(user.id);
  }

  return user;
}
