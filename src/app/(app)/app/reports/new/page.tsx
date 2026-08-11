import Link from "next/link";
import { CreateReportForm } from "@/features/reports/create-report-form";
import { inferCurrentPeriodPreset, todayYmdManila } from "@/lib/dates/period";

export default function NewReportPage() {
  const preset = inferCurrentPeriodPreset(todayYmdManila());

  return (
    <div className="motion-safe-fade-in mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <p className="text-auri-ink-muted text-sm">
          <Link href="/app/reports" className="hover:underline">
            Reports
          </Link>
        </p>
        <h2 className="text-auri-ink text-3xl font-semibold tracking-tight">
          Create report period
        </h2>
        <p className="text-auri-ink-muted text-sm">
          First half is days 1–15. Second half runs from day 16 through the last calendar
          day. Custom ranges stay schema-supported but hidden from this screen.
        </p>
      </div>

      <div className="border-auri-border bg-auri-surface rounded-3xl border p-6">
        <CreateReportForm
          defaultYear={preset.year}
          defaultMonth={preset.month}
          defaultKind={preset.kind}
        />
      </div>
    </div>
  );
}
