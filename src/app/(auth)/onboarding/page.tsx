import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

const steps = [
  "Welcome",
  "Employee and office",
  "Work schedule",
  "Signatories",
  "Templates",
  "Ready",
] as const;

export default function OnboardingPage() {
  return (
    <AuthCard
      title="Welcome to Auri"
      description="Onboarding will collect employee, schedule, and signatory details before your first report."
    >
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li
            key={step}
            className="border-auri-border bg-auri-orange-50/40 text-auri-ink flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm"
          >
            <span className="bg-auri-orange-600 grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Button asChild className="w-full">
        <Link href="/app">Continue to workspace shell</Link>
      </Button>
      <p className="text-auri-ink-muted text-xs">
        Full resumable onboarding arrives in Phase 3.
      </p>
    </AuthCard>
  );
}
