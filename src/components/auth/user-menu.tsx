"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({ email }: { email?: string | null }) {
  const router = useRouter();
  const label = email?.trim() || "Account";
  const initial = label.slice(0, 1).toUpperCase();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="bg-auri-orange-50 text-auri-orange-700 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        aria-hidden="true"
      >
        {initial}
      </span>
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
