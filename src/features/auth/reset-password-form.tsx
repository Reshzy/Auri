"use client";

import { useActionState } from "react";
import { AuthFormMessage, AuthSubmitButton } from "@/features/auth/auth-form-status";
import { resetPasswordAction, type AuthActionState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form className="space-y-4" action={formAction}>
      <AuthFormMessage error={state.error} success={state.success} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <AuthSubmitButton idleLabel="Update password" pendingLabel="Updating…" />
    </form>
  );
}
