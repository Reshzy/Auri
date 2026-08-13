"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { AuriMark } from "@/components/brand/auri-mark";
import { Button } from "@/components/ui/button";
import { AURI_TAGLINE } from "@/lib/brand";

export function MarketingFooter() {
  return (
    <footer className="border-auri-border/80 bg-auri-surface/70 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <AuriMark />
          <p className="text-auri-ink-muted max-w-md text-sm">{AURI_TAGLINE}</p>
        </div>
        <nav
          className="text-auri-ink-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
          aria-label="Footer"
        >
          <Link
            href="/#product"
            className="hover:text-auri-ink inline-flex min-h-11 items-center"
          >
            Product
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-auri-ink inline-flex min-h-11 items-center"
          >
            How it works
          </Link>
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <button type="button" className="hover:text-auri-ink min-h-11">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button type="button" className="hover:text-auri-ink min-h-11">
                Create account
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Button asChild variant="ghost" size="sm">
              <Link href="/app">Open app</Link>
            </Button>
          </Show>
        </nav>
      </div>
    </footer>
  );
}
