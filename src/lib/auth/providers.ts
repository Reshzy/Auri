export const AUTH_OAUTH_PROVIDERS = ["google", "github", "facebook"] as const;

export type AuthOAuthProvider = (typeof AUTH_OAUTH_PROVIDERS)[number];

export const AUTH_OAUTH_LABELS: Record<AuthOAuthProvider, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
  facebook: "Continue with Facebook",
};
