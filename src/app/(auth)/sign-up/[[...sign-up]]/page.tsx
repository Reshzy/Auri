import { SignUp } from "@clerk/nextjs";
import { AuthCard } from "@/components/auth/auth-card";

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start preparing DTR and accomplishment reports in one place."
    >
      <div className="flex justify-center py-2">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/onboarding"
        />
      </div>
    </AuthCard>
  );
}
