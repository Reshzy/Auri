import Link from "next/link";
import { AuriMark } from "@/components/brand/auri-mark";
import { SkipToContent } from "@/components/layout/skip-to-content";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <SkipToContent />
      <header className="border-auri-border/70 bg-auri-paper/80 border-b px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6 sm:pt-4 sm:pb-4">
        <Link
          href="/"
          aria-label="Auri home"
          className="inline-flex min-h-11 items-center"
        >
          <AuriMark />
        </Link>
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-start justify-center px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:items-center sm:px-6 sm:pt-10 sm:pb-10"
      >
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
