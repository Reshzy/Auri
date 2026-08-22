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
  "Clerk never loaded because this live publishable key’s Frontend API is clerk.<your-app>.vercel.app, and you cannot create that DNS name on vercel.app. Switching auri-rosy to auri-azure does not fix it. Either (1) Clerk Dashboard → Development → copy pk_test_ / sk_test_ keys (Frontend API ends in clerk.accounts.dev), add https://auri-azure.vercel.app as an allowed origin, re-import on Vercel, and redeploy; or (2) attach a domain you own and finish Clerk Production DNS.";

export function isAuthConfigError(error: string | string[] | undefined): boolean {
  const value = Array.isArray(error) ? error[0] : error;
  return value === AUTH_CONFIG_ERROR_QUERY;
}
