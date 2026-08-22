export const AUTH_SIGN_IN_TITLE = "Sign in";
export const AUTH_SIGN_IN_DESCRIPTION = "Continue to your Auri workspace.";

export const AUTH_SIGN_UP_TITLE = "Create your account";
export const AUTH_SIGN_UP_DESCRIPTION =
  "Start preparing your Daily Time Record and accomplishment report in one place.";

export const AUTH_SIGN_IN_SWITCHER_PROMPT = "Don't have an account?";
export const AUTH_SIGN_IN_SWITCHER_ACTION = "Sign up";
export const AUTH_SIGN_UP_SWITCHER_PROMPT = "Already have an account?";
export const AUTH_SIGN_UP_SWITCHER_ACTION = "Sign in";

export const AUTH_CONFIG_ERROR_QUERY = "config";
export const AUTH_CONFIG_ERROR_TITLE = "Auri cannot open the workspace";
export const AUTH_CONFIG_ERROR_BODY =
  "Clerk or the database is not configured on this instance. You can still try to sign in, but reports cannot load until both are connected.";

export const AUTH_CLERK_LOAD_TITLE = "Sign-in is not connected";
export const AUTH_CLERK_LOAD_BODY =
  "Clerk never loaded in this browser. Recreating the Vercel project does not change Clerk. In the Clerk Dashboard, Production instance, add this exact site origin under allowed origins, then copy API keys whose Frontend API is a *.clerk.accounts.dev host — not clerk.*.vercel.app. Put those keys on Vercel and redeploy.";

export function isAuthConfigError(error: string | string[] | undefined): boolean {
  const value = Array.isArray(error) ? error[0] : error;
  return value === AUTH_CONFIG_ERROR_QUERY;
}
