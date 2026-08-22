import { redirect } from "next/navigation";
import { isAuthRequiredError, isNextControlFlowError } from "@/lib/auth/errors";

/**
 * Signed-in users with a database/schema failure must not be sent to /sign-in.
 * Clerk's SignIn widget immediately sends them back to /app (redirect loop).
 */
export function shouldShowDatabaseUnavailable(error: unknown): true {
  if (isNextControlFlowError(error)) {
    throw error;
  }
  if (isAuthRequiredError(error)) {
    redirect("/sign-in");
  }
  return true;
}