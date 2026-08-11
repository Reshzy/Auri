"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { AuriMark } from "@/components/brand/auri-mark";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
] as const;

export function MarketingHeader() {
  return (
    <header className="border-auri-border/70 bg-auri-paper/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Auri home">
          <AuriMark />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Marketing">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-auri-ink-muted hover:text-auri-ink text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <Button size="sm">Get started</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/app">Open app</Link>
            </Button>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
