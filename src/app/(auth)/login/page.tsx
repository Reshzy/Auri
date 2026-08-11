import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
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
      <form className="space-y-4" action="/app">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-auri-orange-700 text-xs font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Continue
        </Button>
        <p className="text-auri-ink-muted text-xs">
          Authentication wiring arrives in Phase 2. This shell validates the route and
          layout only.
        </p>
      </form>
    </AuthCard>
  );
}
