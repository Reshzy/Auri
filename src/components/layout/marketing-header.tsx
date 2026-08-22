import Link from "next/link";
import { MarketingAuthLinks } from "@/components/auth/marketing-auth-links";
import { AuriMark } from "@/components/brand/auri-mark";
import { getOptionalAuthUser } from "@/lib/auth/session";

export async function MarketingHeader() {
  const { signedIn, email } = await getOptionalAuthUser();

  return (
    <header className="border-auri-border/70 bg-auri-paper/85 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className="auri-safe-x mx-auto flex h-16 max-w-6xl items-center justify-between">
        <Link href="/" aria-label="Auri home">
          <AuriMark priority />
        </Link>
        <MarketingAuthLinks signedIn={signedIn} email={email} />
      </div>
    </header>
  );
}
