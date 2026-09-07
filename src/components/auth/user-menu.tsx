"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Files, PenLine, User, X } from "lucide-react";
import { AvatarShine } from "@/components/motion/avatar-shine";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { dicebearAvatarUrl } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const settingsShortcuts = [
  { href: "/app/settings/profile", label: "Profile & office", icon: User },
  { href: "/app/settings/schedule", label: "Work schedule", icon: Clock },
  { href: "/app/settings/signatories", label: "Signatories", icon: PenLine },
  { href: "/app/settings/templates", label: "Templates", icon: Files },
] as const;

function ProfileAvatarFace({
  avatarSrc,
  avatarFailed,
  initial,
  className,
  onError,
}: {
  avatarSrc: string | null;
  avatarFailed: boolean;
  initial: string;
  className: string;
  onError: () => void;
}) {
  return (
    <AvatarShine
      className={cn("bg-auri-surface ring-auri-border shrink-0 ring-1", className)}
    >
      {avatarSrc && !avatarFailed ? (
        // DiceBear SVG animation requires a native img; next/image does not optimize SVG.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarSrc}
          alt=""
          width={80}
          height={80}
          className="h-full w-full object-cover"
          onError={onError}
        />
      ) : (
        <span
          className="bg-auri-orange-50 text-auri-orange-700 flex h-full w-full items-center justify-center font-semibold"
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
    </AvatarShine>
  );
}

export function UserMenu({
  email,
  userId,
  employeeName,
  compact = false,
  variant = "app",
}: {
  email?: string | null;
  userId?: string | null;
  employeeName?: string | null;
  compact?: boolean;
  variant?: "app" | "marketing";
}) {
  const router = useRouter();
  const emailId = useId();
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const displayName = employeeName?.trim() || email?.trim() || "Account";
  const initial = displayName.slice(0, 1).toUpperCase();
  const avatarSrc = userId ? dicebearAvatarUrl(userId) : null;
  const showSettings = variant === "app";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={compact ? displayName : undefined}
        className={cn(
          "flex min-w-0 cursor-pointer items-center gap-2 text-left",
          compact
            ? "rounded-full"
            : "hover:bg-auri-orange-50 w-full rounded-2xl px-1 py-1",
        )}
        onClick={() => setOpen(true)}
      >
        <ProfileAvatarFace
          avatarSrc={avatarSrc}
          avatarFailed={avatarFailed}
          initial={initial}
          className="h-11 w-11 text-sm"
          onError={() => setAvatarFailed(true)}
        />
        {compact ? null : (
          <span className="min-w-0 flex-1">
            <span className="text-auri-ink block truncate text-sm font-medium">
              {displayName}
            </span>
            {employeeName?.trim() && email?.trim() ? (
              <span className="text-auri-ink-muted block truncate text-xs">{email}</span>
            ) : null}
          </span>
        )}
      </button>

      <DialogContent
        aria-describedby={emailId}
        className="w-[min(100%-1.5rem,22rem)] overflow-hidden p-0"
      >
        <DialogClose
          className="text-auri-ink-muted hover:bg-auri-orange-50 hover:text-auri-ink absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full"
          aria-label="Close account"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </DialogClose>

        <div className="bg-auri-orange-50 px-5 pt-8 pb-5 text-center">
          <ProfileAvatarFace
            avatarSrc={avatarSrc}
            avatarFailed={avatarFailed}
            initial={initial}
            className="mx-auto h-20 w-20 text-xl"
            onError={() => setAvatarFailed(true)}
          />
          <DialogTitle className="mt-3 text-base">{displayName}</DialogTitle>
          <DialogDescription id={emailId} className="mt-0.5 truncate">
            {email?.trim() || "Signed in"}
          </DialogDescription>
        </div>

        <div className="p-3">
          {showSettings ? (
            <nav aria-label="Account settings">
              <ul className="space-y-0.5">
                {settingsShortcuts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <DialogClose asChild>
                        <Link
                          href={item.href}
                          className="text-auri-ink hover:bg-auri-orange-50 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {item.label}
                        </Link>
                      </DialogClose>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : (
            <DialogClose asChild>
              <Link
                href="/app"
                className="border-auri-border bg-auri-surface text-auri-ink hover:bg-auri-orange-50 flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium"
              >
                Open app
              </Link>
            </DialogClose>
          )}

          <Button
            type="button"
            variant="ghost"
            className="mt-1 w-full"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
