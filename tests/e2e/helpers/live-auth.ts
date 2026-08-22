export function hasLiveAuth(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
    Boolean(process.env.E2E_USER_EMAIL) &&
    Boolean(process.env.E2E_USER_PASSWORD)
  );
}

export function hasSecondLiveAuth(): boolean {
  return (
    Boolean(process.env.E2E_USER_B_EMAIL) && Boolean(process.env.E2E_USER_B_PASSWORD)
  );
}
