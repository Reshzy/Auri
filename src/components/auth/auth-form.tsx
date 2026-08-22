"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import {
  AUTH_CHECK_EMAIL_BODY,
  AUTH_CHECK_EMAIL_TITLE,
  toAuthFormError,
} from "@/lib/auth/copy";
import { safeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({
  mode,
  nextPath,
}: {
  mode: "sign-in" | "sign-up";
  nextPath?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const next = safeNextPath(nextPath, mode === "sign-up" ? "/onboarding" : "/app");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const supabase = createClient();
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(toAuthFormError(signInError.message));
          return;
        }
        router.push(next);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) {
        setError(toAuthFormError(signUpError.message));
        return;
      }
      if (!data.session) {
        setCheckEmail(true);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (submitError) {
      setError(
        toAuthFormError(submitError instanceof Error ? submitError.message : null),
      );
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <Alert tone="success" title={AUTH_CHECK_EMAIL_TITLE}>
        {AUTH_CHECK_EMAIL_BODY}
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <OAuthButtons disabled={pending} onError={setError} />
      <div className="relative">
        <div
          className="border-auri-border absolute inset-0 flex items-center"
          aria-hidden="true"
        >
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-auri-surface text-auri-ink-muted px-2">
            or continue with email
          </span>
        </div>
      </div>
      <form className="space-y-4" onSubmit={(event) => void onSubmit(event)} noValidate>
        {error ? (
          <Alert tone="danger" title="Could not continue">
            {error}
          </Alert>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
