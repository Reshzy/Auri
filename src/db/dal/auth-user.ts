import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureProfileForClerkUser } from "@/db/dal/profiles";
import {
  AUTH_REQUIRED_ERROR,
  DATABASE_UNAVAILABLE_ERROR,
} from "@/lib/auth/errors";
import { hasDatabaseUrl } from "@/lib/env";

export type AuthenticatedUser = {
  id: string;
  clerkUserId: string;
  email: string | null;
};

/**
 * Resolves the signed-in Clerk user and maps them to a profiles UUID.
 * Never accepts a user id from forms, query strings, or request bodies.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const { isAuthenticated, userId: clerkUserId } = await auth();

  if (!isAuthenticated || !clerkUserId) {
    throw new Error(AUTH_REQUIRED_ERROR);
  }

  if (!hasDatabaseUrl()) {
    throw new Error(DATABASE_UNAVAILABLE_ERROR);
  }

  const profile = await ensureProfileForClerkUser(clerkUserId);
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  return {
    id: profile.id,
    clerkUserId,
    email,
  };
}
