import { avatarUrlFromAuthClaims } from "@/lib/auth/avatar";
import { hasAuthConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getOptionalAuthUser(): Promise<{
  signedIn: boolean;
  email: string | null;
  avatarUrl: string | null;
}> {
  if (!hasAuthConfig()) {
    return { signedIn: false, email: null, avatarUrl: null };
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) {
      return { signedIn: false, email: null, avatarUrl: null };
    }
    const email = typeof claims.email === "string" ? claims.email : null;
    return {
      signedIn: true,
      email,
      avatarUrl: avatarUrlFromAuthClaims(claims),
    };
  } catch {
    return { signedIn: false, email: null, avatarUrl: null };
  }
}
