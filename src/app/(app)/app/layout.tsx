import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileAppNav } from "@/components/layout/mobile-app-nav";
import { ensureProfile } from "@/db/dal/profiles";
import { getAppUser } from "@/db/dal/get-app-user";
import { isOnboardingComplete } from "@/lib/onboarding/progress";
import { hasDatabaseUrl, hasClerkConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (hasClerkConfig()) {
    try {
      const user = await getAppUser();
      if (hasDatabaseUrl()) {
        const profile = await ensureProfile(user.id);
        if (!isOnboardingComplete(profile.onboardingCompletedAt)) {
          redirect("/onboarding");
        }
      }
    } catch {
      redirect("/sign-in");
    }
  }

  return (
    <div className="min-h-screen md:flex">
      <AppSidebar className="hidden md:flex" />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
      </div>
      <MobileAppNav />
    </div>
  );
}
