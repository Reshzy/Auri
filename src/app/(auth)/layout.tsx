import Link from "next/link";
import { AuriMark } from "@/components/brand/auri-mark";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-auri-border/70 bg-auri-paper/80 border-b px-4 py-4 sm:px-6">
        <Link href="/" aria-label="Auri home">
          <AuriMark />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
