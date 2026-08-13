import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16">
      <EmptyState
        title="Page not found"
        description="That address is not part of Auri. Open the home page or your workspace."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app">Open workspace</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
