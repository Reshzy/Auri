"use client";

import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";
import { AuriMark } from "@/components/brand/auri-mark";
import { Button } from "@/components/ui/button";
import { AURI_TAGLINE } from "@/lib/brand";

export function MarketingFooter() {
  return (
    <footer className="border-auri-border/80 bg-auri-surface/70 border-t pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
      <div className="auri-safe-x mx-auto flex max-w-6xl flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <AuriMark />
          <p className="text-auri-ink-muted max-w-md text-sm">{AURI_TAGLINE}</p>
        </div>
        <Show when="signed-out">
          <SignInButton mode="redirect">
            <button
              type="button"
              className="text-auri-ink-muted hover:text-auri-ink inline-flex min-h-11 items-center text-sm"
            >
              Sign in
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <Button asChild variant="ghost">
            <Link href="/app">Open app</Link>
          </Button>
        </Show>
      </div>
    </footer>
  );
}
