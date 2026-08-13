"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { FileText, LayoutDashboard, Sparkles } from "lucide-react";
import { AuriMark } from "@/components/brand/auri-mark";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/reports", label: "Reports", icon: FileText },
  { href: "/app/presets", label: "Presets", icon: Sparkles },
] as const;

const settingsNav = [
  { href: "/app/settings/profile", label: "Profile & office" },
  { href: "/app/settings/schedule", label: "Work schedule" },
  { href: "/app/settings/signatories", label: "Signatories" },
  { href: "/app/settings/templates", label: "Templates" },
] as const;

type AppSidebarProps = {
  className?: string;
};

export function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "border-auri-border bg-auri-surface/90 flex h-full w-64 flex-col border-r",
        className,
      )}
    >
      <div className="border-auri-border border-b px-5 py-5">
        <Link href="/app" aria-label="Auri application home">
          <AuriMark />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 px-3 py-5" aria-label="Application">
        <div className="space-y-1">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-auri-orange-50 text-auri-ink"
                    : "text-auri-ink-muted hover:bg-auri-orange-50 hover:text-auri-ink",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div>
          <p className="text-auri-ink-muted mb-2 px-3 text-xs font-semibold tracking-wide uppercase">
            Settings
          </p>
          <div className="space-y-1">
            {settingsNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-xl px-3 py-2 pl-10 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-auri-orange-50 text-auri-ink"
                    : "text-auri-ink-muted hover:bg-auri-orange-50 hover:text-auri-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <div className="border-auri-border flex items-center border-t px-3 py-3">
        <UserButton />
      </div>
    </aside>
  );
}
