"use client";

import { useActionState } from "react";
import { AuthFormMessage, AuthSubmitButton } from "@/features/auth/auth-form-status";
import { signUpAction, type AuthActionState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <form className="space-y-4" action={formAction}>
      <AuthFormMessage error={state.error} success={state.success} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <AuthSubmitButton idleLabel="Get started" pendingLabel="Creating account…" />
    </form>
  );
}
