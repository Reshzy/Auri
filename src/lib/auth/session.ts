import { createClient } from "@/lib/supabase/server";
import { hasAuthConfig } from "@/lib/env";

export async function getOptionalAuthUser(): Promise<{
  signedIn: boolean;
  email: string | null;
}> {
  if (!hasAuthConfig()) {
    return { signedIn: false, email: null };
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) {
      return { signedIn: false, email: null };
    }
    const email = typeof claims.email === "string" ? claims.email : null;
    return { signedIn: true, email };
  } catch {
    return { signedIn: false, email: null };
  }
}
