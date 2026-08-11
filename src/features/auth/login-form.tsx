"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthFormMessage, AuthSubmitButton } from "@/features/auth/auth-form-status";
import { signInAction, type AuthActionState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form className="space-y-4" action={formAction}>
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <AuthFormMessage error={state.error} success={state.success} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-auri-orange-700 text-xs font-medium hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <AuthSubmitButton idleLabel="Continue" pendingLabel="Signing in…" />
    </form>
  );
}
