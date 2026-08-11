import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/features/auth/login-form";
import { safeNextPath } from "@/lib/auth/paths";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next ? safeNextPath(params.next) : undefined;
  const callbackError =
    params.error === "auth_callback"
      ? "Unable to complete sign-in. Request a new link and try again."
      : params.error === "config"
        ? "Authentication is not configured. Add Supabase credentials to .env.local."
        : undefined;

  return (
    <AuthCard
      title="Sign in"
      description="Access your reports, presets, and generated files."
      footer={
        <p>
          Need an account?{" "}
          <Link
            href="/signup"
            className="text-auri-orange-700 font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      }
    >
      {callbackError ? (
        <p
          role="alert"
          className="border-auri-danger/30 bg-auri-danger/5 text-auri-danger mb-4 rounded-xl border px-3 py-2 text-sm"
        >
          {callbackError}
        </p>
      ) : null}
      <LoginForm nextPath={nextPath} />
    </AuthCard>
  );
}
