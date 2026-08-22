"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { AuriMark } from "@/components/brand/auri-mark";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  const { isLoaded, isSignedIn } = useAuth();
  const showApp = isLoaded && isSignedIn;

  return (
    <header className="border-auri-border/70 bg-auri-paper/85 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className="auri-safe-x mx-auto flex h-16 max-w-6xl items-center justify-between">
        <Link href="/" aria-label="Auri home">
          <AuriMark priority />
        </Link>
        <div className="flex items-center gap-2">
          {showApp ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/app">Open app</Link>
              </Button>
              <UserButton />
            </>
          ) : (
            <Button asChild variant="ghost">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
