import { SignIn } from "@clerk/nextjs";
import { AuthCard } from "@/components/auth/auth-card";

export default function SignInPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Continue to your Auri workspace."
    >
      <div className="flex justify-center py-2">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/app"
        />
      </div>
    </AuthCard>
  );
}
