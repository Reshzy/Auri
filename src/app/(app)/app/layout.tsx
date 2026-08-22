import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileAppNav } from "@/components/layout/mobile-app-nav";
import { SkipToContent } from "@/components/layout/skip-to-content";
import { ensureProfile } from "@/db/dal/profiles";
import { getAppUser } from "@/db/dal/get-app-user";
import { isOnboardingComplete } from "@/lib/onboarding/progress";
import { hasDatabaseUrl, hasAuthConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let email: string | null = null;
  let avatarUrl: string | null = null;
  if (hasAuthConfig()) {
    try {
      const user = await getAppUser();
      email = user.email;
      avatarUrl = user.avatarUrl ?? null;
      if (hasDatabaseUrl()) {
        const profile = await ensureProfile(user.id);
        if (!isOnboardingComplete(profile.onboardingCompletedAt)) {
          redirect("/onboarding");
        }
      }
    } catch (error) {
      const digest =
        error && typeof error === "object" && "digest" in error
          ? String((error as { digest?: unknown }).digest)
          : "";
      if (digest.includes("NEXT_REDIRECT") || digest.includes("NEXT_NOT_FOUND")) {
        throw error;
      }
      redirect("/sign-in");
    }
  }

  return (
    <div className="relative min-h-dvh">
      <SkipToContent />
      <div className="md:flex md:min-h-dvh">
        <AppSidebar className="hidden md:flex" email={email} avatarUrl={avatarUrl} />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <AppHeader email={email} avatarUrl={avatarUrl} />
          <main
            id="main-content"
            className="flex-1 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pb-8"
          >
            {children}
          </main>
        </div>
      </div>
      <MobileAppNav />
    </div>
  );
}
