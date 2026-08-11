import Link from "next/link";
import { AuriMark } from "@/components/brand/auri-mark";

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
        <div className="text-auri-ink-muted flex gap-4 text-sm">
          <Link href="/login" className="hover:text-auri-ink">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-auri-ink">
            Create account
          </Link>
        </div>
      </div>
    </footer>
  );
}
