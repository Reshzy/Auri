"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { AuriMark } from "@/components/brand/auri-mark";
import { Button } from "@/components/ui/button";

export function MarketingFooter() {
  return (
    <footer className="border-auri-border/80 bg-auri-surface/70 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <AuriMark />
          <p className="text-auri-ink-muted max-w-md text-sm">
            Work, without the paperwork.
          </p>
        </div>
        <div className="text-auri-ink-muted flex items-center gap-4 text-sm">
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <button type="button" className="hover:text-auri-ink">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button type="button" className="hover:text-auri-ink">
                Create account
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Button asChild variant="ghost" size="sm">
              <Link href="/app">Open app</Link>
            </Button>
          </Show>
        </div>
      </div>
    </footer>
  );
}
