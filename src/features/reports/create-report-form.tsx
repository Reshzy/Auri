"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage, SubmitButton } from "@/features/settings/form-status";
import { createReportAction, type ReportActionState } from "@/features/reports/actions";

const initial: ReportActionState = {};

export function CreateReportForm({
  defaultYear,
  defaultMonth,
  defaultKind,
}: {
  defaultYear: number;
  defaultMonth: number;
  defaultKind: "FIRST_HALF" | "SECOND_HALF";
}) {
  const [state, action] = useActionState(createReportAction, initial);

  return (
    <form action={action} className="space-y-6">
      <FormMessage error={state.error} success={state.success} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            name="year"
            type="number"
            min={2000}
            max={2100}
            defaultValue={defaultYear}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="month">Month</Label>
          <Input
            id="month"
            name="month"
            type="number"
            min={1}
            max={12}
            defaultValue={defaultMonth}
            required
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-auri-ink text-sm font-medium">Period</legend>
        <label className="border-auri-border bg-auri-surface flex cursor-pointer items-start gap-3 rounded-2xl border p-4">
          <input
            type="radio"
            name="periodKind"
            value="FIRST_HALF"
            defaultChecked={defaultKind === "FIRST_HALF"}
            className="mt-1"
          />
          <span>
            <span className="text-auri-ink block font-medium">First half</span>
            <span className="text-auri-ink-muted text-sm">Days 1–15</span>
          </span>
        </label>
        <label className="border-auri-border bg-auri-surface flex cursor-pointer items-start gap-3 rounded-2xl border p-4">
          <input
            type="radio"
            name="periodKind"
            value="SECOND_HALF"
            defaultChecked={defaultKind === "SECOND_HALF"}
            className="mt-1"
          />
          <span>
            <span className="text-auri-ink block font-medium">Second half</span>
            <span className="text-auri-ink-muted text-sm">
              Day 16 through the last calendar day
            </span>
          </span>
        </label>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <SubmitButton idleLabel="Create report" pendingLabel="Creating…" />
        <Button type="button" variant="ghost" asChild>
          <Link href="/app/reports">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
