import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <form className="space-y-4" action="/onboarding">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Get started
        </Button>
        <p className="text-auri-ink-muted text-xs">
          Account creation connects to Supabase Auth in Phase 2.
        </p>
      </form>
    </AuthCard>
  );
}
