"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";

export function MarketingAuthLinks({
  signedIn,
  email,
  avatarUrl,
}: {
  signedIn: boolean;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  if (signedIn) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link href="/app">Open app</Link>
        </Button>
        <UserMenu email={email} avatarUrl={avatarUrl} />
      </div>
    );
  }

  return (
    <Button asChild variant="ghost">
      <Link href="/sign-in">Sign in</Link>
    </Button>
  );
}
