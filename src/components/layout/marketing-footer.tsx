"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { AuriMark } from "@/components/brand/auri-mark";
import { Button } from "@/components/ui/button";
import { AURI_TAGLINE } from "@/lib/brand";

export function MarketingFooter() {
  const { isLoaded, isSignedIn } = useAuth();
  const showApp = isLoaded && isSignedIn;

  return (
    <footer className="border-auri-border/80 bg-auri-surface/70 border-t pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
      <div className="auri-safe-x mx-auto flex max-w-6xl flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <AuriMark />
          <p className="text-auri-ink-muted max-w-md text-sm">{AURI_TAGLINE}</p>
        </div>
        {showApp ? (
          <Button asChild variant="ghost">
            <Link href="/app">Open app</Link>
          </Button>
        ) : (
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        )}
      </div>
    </footer>
  );
}
