import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileAppNav } from "@/components/layout/mobile-app-nav";
import { SkipToContent } from "@/components/layout/skip-to-content";
import { DatabaseUnavailable } from "@/components/ui/unavailable-state";
import { ensureProfile } from "@/db/dal/profiles";
import { getAppUser } from "@/db/dal/get-app-user";
import { isAuthRequiredError, isNextControlFlowError } from "@/lib/auth/errors";
import { hasDatabaseUrl, hasClerkConfig } from "@/lib/env";
import { isOnboardingComplete } from "@/lib/onboarding/progress";

export const dynamic = "force-dynamic";

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <SkipToContent />
      <div className="md:flex md:min-h-dvh">
        <AppSidebar className="hidden md:flex" />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <AppHeader />
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

export default async function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (hasClerkConfig()) {
    if (!hasDatabaseUrl()) {
      return (
        <AppShell>
          <DatabaseUnavailable />
        </AppShell>
      );
    }

    try {
      const user = await getAppUser();
      const profile = await ensureProfile(user.id);
      if (!isOnboardingComplete(profile.onboardingCompletedAt)) {
        redirect("/onboarding");
      }
    } catch (error) {
      if (isNextControlFlowError(error)) {
        throw error;
      }
      if (isAuthRequiredError(error)) {
        redirect("/sign-in");
      }
      return (
        <AppShell>
          <DatabaseUnavailable />
        </AppShell>
      );
    }
  }

  return <AppShell>{children}</AppShell>;
}
