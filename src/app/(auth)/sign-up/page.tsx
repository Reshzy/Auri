import type { Metadata } from "next";
import { AuthAccountSwitcher } from "@/components/auth/auth-account-switcher";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import {
  AUTH_SIGN_UP_DESCRIPTION,
  AUTH_SIGN_UP_SWITCHER_ACTION,
  AUTH_SIGN_UP_SWITCHER_PROMPT,
  AUTH_SIGN_UP_TITLE,
} from "@/lib/auth/copy";

export const metadata: Metadata = {
  title: AUTH_SIGN_UP_TITLE,
  description: AUTH_SIGN_UP_DESCRIPTION,
};

export default function SignUpPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <AuthCard
        title={AUTH_SIGN_UP_TITLE}
        description={AUTH_SIGN_UP_DESCRIPTION}
        switcher={
          <AuthAccountSwitcher
            prompt={AUTH_SIGN_UP_SWITCHER_PROMPT}
            href="/sign-in"
            actionLabel={AUTH_SIGN_UP_SWITCHER_ACTION}
          />
        }
      >
        <AuthForm mode="sign-up" nextPath="/onboarding" />
      </AuthCard>
    </div>
  );
}
