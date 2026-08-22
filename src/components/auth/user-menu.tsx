"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({
  email,
  avatarUrl,
}: {
  email?: string | null;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const label = email?.trim() || "Account";
  const initial = label.slice(0, 1).toUpperCase();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(avatarUrl) && failedSrc !== avatarUrl;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {showPhoto && avatarUrl ? (
        // Native img: OAuth CDNs are not in next/image remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(avatarUrl)}
          className="h-11 w-11 shrink-0 rounded-full object-cover"
          aria-hidden="true"
        />
      ) : (
        <span
          className="bg-auri-orange-50 text-auri-orange-700 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-auri-ink truncate text-sm font-medium" title={label}>
          {label}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto min-h-0 px-0 py-0 text-xs"
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
