import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServiceRoleKey } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role client for trusted scripts / narrowly reviewed server ops only.
 * Never import this module from Client Components.
 */
export function createAdminClient() {
  const env = getPublicEnv();
  const serviceRoleKey = getServiceRoleKey();

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
