"use client";

import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";

function titleForPath(pathname: string): string {
  if (pathname === "/app") return "Overview";
  if (pathname.startsWith("/app/reports/new")) return "New report";
  if (pathname.includes("/preview")) return "Preview";
  if (pathname.includes("/edit")) return "Editor";
  if (pathname.startsWith("/app/reports")) return "Reports";
  if (pathname.startsWith("/app/presets")) return "Presets";
  if (pathname.startsWith("/app/settings/profile")) return "Profile & office";
  if (pathname.startsWith("/app/settings/schedule")) return "Work schedule";
  if (pathname.startsWith("/app/settings/signatories")) return "Signatories";
  if (pathname.startsWith("/app/settings/templates")) return "Templates";
  if (pathname.startsWith("/app/settings")) return "Settings";
  return "Auri";
}

export function AppHeader({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const title = titleForPath(pathname);

  return (
    <header className="border-auri-border bg-auri-surface/80 flex items-center justify-between gap-3 border-b px-4 py-4 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-8 md:pt-4">
      <div>
        <p className="text-auri-ink-muted text-sm">Asia/Manila</p>
        <h1 className="text-auri-ink text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex min-h-11 min-w-11 items-center justify-center md:hidden">
        <UserMenu email={email} />
      </div>
    </header>
  );
}
