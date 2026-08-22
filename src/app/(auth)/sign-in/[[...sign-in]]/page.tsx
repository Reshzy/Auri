import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ClerkFormGate } from "@/components/auth/clerk-form-gate";
import { Alert } from "@/components/ui/alert";
import { AuthAccountSwitcher } from "@/components/auth/auth-account-switcher";
import { AuthCard } from "@/components/auth/auth-card";
import {
  AUTH_CONFIG_ERROR_BODY,
  AUTH_CONFIG_ERROR_TITLE,
  AUTH_SIGN_IN_DESCRIPTION,
  AUTH_SIGN_IN_SWITCHER_ACTION,
  AUTH_SIGN_IN_SWITCHER_PROMPT,
  AUTH_SIGN_IN_TITLE,
  isAuthConfigError,
} from "@/lib/auth/copy";

export const metadata: Metadata = {
  title: AUTH_SIGN_IN_TITLE,
  description: AUTH_SIGN_IN_DESCRIPTION,
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { isAuthenticated } = await auth();
  if (isAuthenticated && !isAuthConfigError(error)) {
    redirect("/app");
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <AuthCard
        title={AUTH_SIGN_IN_TITLE}
        description={AUTH_SIGN_IN_DESCRIPTION}
        switcher={
          <AuthAccountSwitcher
            prompt={AUTH_SIGN_IN_SWITCHER_PROMPT}
            href="/sign-up"
            actionLabel={AUTH_SIGN_IN_SWITCHER_ACTION}
          />
        }
        notice={
          isAuthConfigError(error) ? (
            <Alert tone="danger" title={AUTH_CONFIG_ERROR_TITLE}>
              {AUTH_CONFIG_ERROR_BODY}
            </Alert>
          ) : null
        }
      >
        {isAuthenticated ? null : (
          <ClerkFormGate>
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/app"
            />
          </ClerkFormGate>
        )}
      </AuthCard>
    </div>
  );
}
