"use client";

import { useActionState } from "react";
import { AuthFormMessage, AuthSubmitButton } from "@/features/auth/auth-form-status";
import { forgotPasswordAction, type AuthActionState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <form className="space-y-4" action={formAction}>
      <AuthFormMessage error={state.error} success={state.success} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <AuthSubmitButton idleLabel="Send reset link" pendingLabel="Sending…" />
    </form>
  );
}
