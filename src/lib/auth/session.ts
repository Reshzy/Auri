import "server-only";

import { ensureProfileForAuthUser } from "@/db/dal/profiles";
import { hasAuthConfig, hasDatabaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getOptionalAuthUser(): Promise<{
  signedIn: boolean;
  email: string | null;
  userId: string | null;
}> {
  if (!hasAuthConfig()) {
    return { signedIn: false, email: null, userId: null };
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const authUserId = typeof claims?.sub === "string" ? claims.sub : "";
    if (!authUserId) {
      return { signedIn: false, email: null, userId: null };
    }
    const email = typeof claims?.email === "string" ? claims.email : null;
    let userId: string | null = null;
    if (hasDatabaseUrl()) {
      try {
        const profile = await ensureProfileForAuthUser(authUserId);
        userId = profile.id;
      } catch {
        userId = null;
      }
    }
    return { signedIn: true, email, userId };
  } catch {
    return { signedIn: false, email: null, userId: null };
  }
}
