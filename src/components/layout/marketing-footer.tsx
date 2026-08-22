import { MarketingAuthLinks } from "@/components/auth/marketing-auth-links";
import { AuriMark } from "@/components/brand/auri-mark";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { AURI_TAGLINE } from "@/lib/brand";

export async function MarketingFooter() {
  const { signedIn, email, avatarUrl } = await getOptionalAuthUser();

  return (
    <footer className="border-auri-border/80 bg-auri-surface/70 border-t pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
      <div className="auri-safe-x mx-auto flex max-w-6xl flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <AuriMark />
          <p className="text-auri-ink-muted max-w-md text-sm">{AURI_TAGLINE}</p>
        </div>
        <MarketingAuthLinks signedIn={signedIn} email={email} avatarUrl={avatarUrl} />
      </div>
    </footer>
  );
}
