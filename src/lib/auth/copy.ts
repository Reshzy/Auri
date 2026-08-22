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
  "Supabase Auth or the database is not configured on this instance. You can still try to sign in, but reports cannot load until both are connected.";

export const AUTH_CALLBACK_ERROR_TITLE = "Sign-in did not finish";
export const AUTH_CALLBACK_ERROR_BODY =
  "The sign-in link expired or was cancelled. Try again from the sign-in page.";

export const AUTH_CHECK_EMAIL_TITLE = "Check your email";
export const AUTH_CHECK_EMAIL_BODY =
  "We sent a confirmation link. Open it to finish creating your account, then sign in.";

export function isAuthConfigError(error: string | string[] | undefined): boolean {
  const value = Array.isArray(error) ? error[0] : error;
  return value === AUTH_CONFIG_ERROR_QUERY;
}

export function isAuthCallbackError(error: string | string[] | undefined): boolean {
  const value = Array.isArray(error) ? error[0] : error;
  return value === "auth";
}

export function toAuthFormError(message: string | null | undefined): string {
  const value = message?.trim() ?? "";
  if (!value) {
    return "Something went wrong. Try again.";
  }
  return value;
}
