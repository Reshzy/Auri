"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Alert tone="danger" title="This screen could not load">
        <p>Your reports and files are unchanged. Try again, or return to overview.</p>
      </Alert>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href="/app">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}
