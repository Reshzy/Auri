import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { AuthAccountSwitcher } from "@/components/auth/auth-account-switcher";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import {
  AUTH_CALLBACK_ERROR_BODY,
  AUTH_CALLBACK_ERROR_TITLE,
  AUTH_CONFIG_ERROR_BODY,
  AUTH_CONFIG_ERROR_TITLE,
  AUTH_SIGN_IN_DESCRIPTION,
  AUTH_SIGN_IN_SWITCHER_ACTION,
  AUTH_SIGN_IN_SWITCHER_PROMPT,
  AUTH_SIGN_IN_TITLE,
  isAuthCallbackError,
  isAuthConfigError,
} from "@/lib/auth/copy";
import { getOptionalAuthUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: AUTH_SIGN_IN_TITLE,
  description: AUTH_SIGN_IN_DESCRIPTION,
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const { signedIn } = await getOptionalAuthUser();
  if (signedIn && !isAuthConfigError(error)) {
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
          ) : isAuthCallbackError(error) ? (
            <Alert tone="danger" title={AUTH_CALLBACK_ERROR_TITLE}>
              {AUTH_CALLBACK_ERROR_BODY}
            </Alert>
          ) : null
        }
      >
        <AuthForm mode="sign-in" nextPath={next} />
      </AuthCard>
    </div>
  );
}
