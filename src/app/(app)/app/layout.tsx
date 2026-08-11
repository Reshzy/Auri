import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileAppNav } from "@/components/layout/mobile-app-nav";
import { ensureProfile } from "@/db/dal/profiles";
import { getAppUser } from "@/db/dal/get-app-user";
import { isOnboardingComplete } from "@/lib/onboarding/progress";
import { hasDatabaseUrl, hasSupabasePublicConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (hasSupabasePublicConfig()) {
    try {
      const user = await getAppUser();
      if (hasDatabaseUrl()) {
        const profile = await ensureProfile(user.id);
        if (!isOnboardingComplete(profile.onboardingCompletedAt)) {
          redirect("/onboarding");
        }
      }
    } catch {
      redirect("/login");
    }
  }

  return (
    <div className="min-h-screen md:flex">
      <AppSidebar className="hidden md:flex" />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-auri-border bg-auri-surface/80 border-b px-4 py-4 md:px-8">
          <p className="text-auri-ink-muted text-sm">Asia/Manila</p>
          <h1 className="text-auri-ink text-lg font-semibold">Workspace</h1>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
      </div>
      <MobileAppNav />
    </div>
  );
}
