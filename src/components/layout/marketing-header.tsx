"use client";

import { useState } from "react";
import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { AuriMark } from "@/components/brand/auri-mark";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="marketing-mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </Button>
        </div>
      </div>
      {open ? (
        <nav
          id="marketing-mobile-nav"
          className="border-auri-border/70 border-t px-4 py-4 md:hidden"
          aria-label="Marketing mobile"
        >
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-auri-ink hover:bg-auri-orange-50 flex min-h-11 items-center rounded-xl px-3 text-sm"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Show when="signed-out">
                <SignInButton mode="redirect">
                  <button
                    type="button"
                    className="text-auri-ink hover:bg-auri-orange-50 flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm"
                  >
                    Sign in
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/app"
                  className="text-auri-ink hover:bg-auri-orange-50 flex min-h-11 items-center rounded-xl px-3 text-sm"
                  onClick={() => setOpen(false)}
                >
                  Open app
                </Link>
              </Show>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
