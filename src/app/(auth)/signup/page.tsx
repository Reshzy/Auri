import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/features/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start recording once and generating both official files."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-auri-orange-700 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
