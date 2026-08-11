"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/features/settings/form-status";
import {
  completeOnboardingAction,
  continueTemplatesAction,
  type SettingsActionState,
} from "@/features/settings/actions";
import type { TemplateAvailabilityItem } from "@/lib/templates/availability-types";

const initialState: SettingsActionState = {};

export function TemplatesAvailabilityPanel({
  items,
  bothAvailable,
  mode,
}: {
  items: TemplateAvailabilityItem[];
  bothAvailable: boolean;
  mode: "onboarding" | "settings";
}) {
  const [state, formAction] = useActionState(continueTemplatesAction, initialState);

  return (
    <div className="space-y-4">
      <FormMessage error={state.error} success={state.success} />
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.key}
            className="border-auri-border rounded-2xl border px-4 py-3 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-auri-ink font-medium">{item.label}</p>
                <p className="text-auri-ink-muted mt-1 text-xs">
                  {item.dbActive
                    ? `Active in database (v${item.version ?? "—"})`
                    : item.manifestPresent && item.sourcePresent
                      ? "Available via audited Phase 0 source + manifest"
                      : "Unavailable"}
                </p>
              </div>
              <span
                className={
                  item.available
                    ? "text-auri-success text-xs font-semibold"
                    : "text-auri-danger text-xs font-semibold"
                }
              >
                {item.available ? "Available" : "Missing"}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {!bothAvailable ? (
        <p className="text-auri-ink-muted text-sm">
          Both the accomplishment DOCX and DTR XLSX templates must be available. Runtime
          activation happens in a later phase; Phase 0 source files satisfy local
          onboarding checks.
        </p>
      ) : null}
      {mode === "onboarding" ? (
        <form action={formAction}>
          <input type="hidden" name="nextStep" value="ready" />
          <SubmitButton
            idleLabel="Continue"
            pendingLabel="Checking…"
            variant={bothAvailable ? "primary" : "secondary"}
          />
        </form>
      ) : null}
    </div>
  );
}

export function ReadyStepPanel() {
  const [state, formAction] = useActionState(completeOnboardingAction, initialState);

  return (
    <div className="space-y-4">
      <FormMessage error={state.error} success={state.success} />
      <p className="text-auri-ink-muted text-sm">
        Your profile, schedule, and signatories are ready. Report period creation arrives
        in Phase 4 — you can open the workspace now and create first- or second-half
        reports when that flow ships.
      </p>
      <form action={formAction} className="space-y-3">
        <SubmitButton idleLabel="Enter workspace" pendingLabel="Finishing…" />
      </form>
      <p className="text-auri-ink-muted text-xs">
        Create current period: available in Phase 4.
      </p>
    </div>
  );
}
