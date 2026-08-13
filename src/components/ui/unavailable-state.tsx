import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function UnavailableState({
  title = "This screen is unavailable",
  description = "The workspace cannot load right now. Check your connection and try again.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Alert tone="warning" title={title}>
      <p>{description}</p>
      <div className="mt-3">
        <Button asChild size="sm" variant="secondary">
          <Link href="/app">Back to overview</Link>
        </Button>
      </div>
    </Alert>
  );
}

export function DatabaseUnavailable() {
  return (
    <UnavailableState
      title="Workspace is not connected"
      description="The database is not configured in this environment. Sign in again after setup, or return to the overview."
    />
  );
}
