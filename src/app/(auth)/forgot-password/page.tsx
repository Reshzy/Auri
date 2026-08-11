import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      description="We will email reset instructions when authentication is connected."
      footer={
        <p>
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-auri-orange-700 font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
