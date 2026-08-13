"use client";

import { usePathname } from "next/navigation";

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

export function AppHeader() {
  const pathname = usePathname();
  const title = titleForPath(pathname);

  return (
    <header className="border-auri-border bg-auri-surface/80 border-b px-4 py-4 md:px-8">
      <p className="text-auri-ink-muted text-sm">Asia/Manila</p>
      <h1 className="text-auri-ink text-lg font-semibold">{title}</h1>
    </header>
  );
}
