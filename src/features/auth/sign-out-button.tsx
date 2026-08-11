"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/features/auth/actions";

function SignOutSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-auri-ink-muted hover:bg-auri-orange-50 hover:text-auri-ink w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SignOutSubmit />
    </form>
  );
}
