export function hasLiveAuth(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY) &&
    Boolean(process.env.E2E_USER_EMAIL) &&
    Boolean(process.env.E2E_USER_PASSWORD)
  );
}

export function hasSecondLiveAuth(): boolean {
  return (
    Boolean(process.env.E2E_USER_B_EMAIL) && Boolean(process.env.E2E_USER_B_PASSWORD)
  );
}
