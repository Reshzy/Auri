import "server-only";

import { ensureProfileForAuthUser } from "@/db/dal/profiles";
import { hasAuthConfig, hasDatabaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  authUserId: string;
  email: string | null;
};

/**
 * Resolves the signed-in Supabase Auth user and maps them to a profiles UUID.
 * Never accepts a user id from forms, query strings, or request bodies.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  if (!hasAuthConfig() || !hasDatabaseUrl()) {
    throw new Error("AUTH_REQUIRED");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const authUserId = typeof claims?.sub === "string" ? claims.sub : "";

  if (error || !authUserId) {
    throw new Error("AUTH_REQUIRED");
  }

  const profile = await ensureProfileForAuthUser(authUserId);
  const email = typeof claims?.email === "string" ? claims.email : null;

  return {
    id: profile.id,
    authUserId,
    email,
  };
}
