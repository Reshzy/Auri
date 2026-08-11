import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

/**
 * Resolves the signed-in user from the Supabase cookie session.
 * Never accepts a user id from forms, query strings, or request bodies.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}
