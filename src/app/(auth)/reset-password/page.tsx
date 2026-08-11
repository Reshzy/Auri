import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      description="Set a new password for your Auri account."
      footer={
        <p>
          <Link
            href="/login"
            className="text-auri-orange-700 font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
