import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppOverviewPage() {
  const today = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="motion-safe-fade-in space-y-8">
      <section className="space-y-2">
        <p className="text-auri-ink-muted text-sm">{today}</p>
        <h2 className="text-auri-ink text-3xl font-semibold tracking-tight">
          Good day. Ready when you are.
        </h2>
        <p className="text-auri-ink-muted max-w-2xl">
          This overview will answer what report to work on now, what is incomplete, and
          where your latest files are.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border-auri-border bg-auri-surface rounded-3xl border p-6">
          <h3 className="text-auri-ink text-lg font-semibold">Current period</h3>
          <p className="text-auri-ink-muted mt-2 text-sm">
            Report creation and completion tracking arrive in Phase 4.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/app/reports/new">Create first-half report</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/reports/new">Create second-half report</Link>
            </Button>
          </div>
        </div>
        <div className="border-auri-border bg-auri-surface rounded-3xl border p-6">
          <h3 className="text-auri-ink text-lg font-semibold">Latest files</h3>
          <p className="text-auri-ink-muted mt-2 text-sm">
            Generated DOCX/XLSX history will appear here after Phase 8.
          </p>
        </div>
      </section>
    </div>
  );
}
