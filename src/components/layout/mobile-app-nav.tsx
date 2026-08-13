"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/reports", label: "Reports", icon: FileText },
  { href: "/app/presets", label: "Presets", icon: Sparkles },
  { href: "/app/settings/profile", label: "Settings", icon: Settings },
] as const;

export function MobileAppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-auri-border bg-auri-surface/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
      aria-label="Mobile application"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : item.href.startsWith("/app/settings")
                ? pathname.startsWith("/app/settings")
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-xs",
                  active ? "text-auri-orange-700" : "text-auri-ink-muted",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
