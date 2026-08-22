"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AUTH_OAUTH_LABELS, AUTH_OAUTH_PROVIDERS } from "@/lib/auth/providers";
import type { AuthOAuthProvider } from "@/lib/auth/providers";
import { toAuthFormError } from "@/lib/auth/copy";

function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export function OAuthButtons({
  disabled,
  onError,
}: {
  disabled?: boolean;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState<AuthOAuthProvider | null>(null);

  async function start(provider: AuthOAuthProvider) {
    setPending(provider);
    onError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl() },
      });
      if (error) {
        onError(toAuthFormError(error.message));
        setPending(null);
      }
    } catch (error) {
      onError(toAuthFormError(error instanceof Error ? error.message : null));
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      {AUTH_OAUTH_PROVIDERS.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="secondary"
          className="w-full"
          disabled={disabled || pending !== null}
          onClick={() => void start(provider)}
        >
          {pending === provider ? "Redirecting…" : AUTH_OAUTH_LABELS[provider]}
        </Button>
      ))}
    </div>
  );
}
