"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage, SubmitButton } from "@/features/settings/form-status";
import {
  saveSignatoriesAction,
  type SettingsActionState,
} from "@/features/settings/actions";

const initialState: SettingsActionState = {};

const SLOT_LABELS = [
  "Employee / signature owner",
  "Verifier 1",
  "Verifier 2",
  "Verifier 3",
] as const;

export type SignatoryFormValue = {
  slot: number;
  displayName: string;
  title: string;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export function SignatoriesForm({
  values,
  nextStep,
  submitLabel = "Save signatories",
}: {
  values: SignatoryFormValue[];
  nextStep?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(saveSignatoriesAction, initialState);
  const ordered = [0, 1, 2, 3].map(
    (slot) =>
      values.find((value) => value.slot === slot) ?? {
        slot,
        displayName: "",
        title: "",
        isActive: true,
        effectiveFrom: null,
        effectiveTo: null,
      },
  );

  return (
    <form className="space-y-4" action={formAction} noValidate>
      {nextStep ? <input type="hidden" name="nextStep" value={nextStep} /> : null}
      <FormMessage error={state.error} success={state.success} />
      {ordered.map((slot) => (
        <fieldset
          key={slot.slot}
          className="border-auri-border bg-auri-orange-50/30 space-y-3 rounded-2xl border p-3"
        >
          <legend className="text-auri-ink px-1 text-sm font-medium">
            Slot {slot.slot + 1}: {SLOT_LABELS[slot.slot]}
          </legend>
          <input type="hidden" name={`isActive_${slot.slot}`} value="true" />
          <div className="space-y-2">
            <Label htmlFor={`displayName_${slot.slot}`}>Display name</Label>
            <Input
              id={`displayName_${slot.slot}`}
              name={`displayName_${slot.slot}`}
              defaultValue={slot.displayName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`title_${slot.slot}`}>Title</Label>
            <Input
              id={`title_${slot.slot}`}
              name={`title_${slot.slot}`}
              defaultValue={slot.title}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`effectiveFrom_${slot.slot}`}>
                Effective from (optional)
              </Label>
              <Input
                id={`effectiveFrom_${slot.slot}`}
                name={`effectiveFrom_${slot.slot}`}
                type="date"
                defaultValue={slot.effectiveFrom ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`effectiveTo_${slot.slot}`}>Effective to (optional)</Label>
              <Input
                id={`effectiveTo_${slot.slot}`}
                name={`effectiveTo_${slot.slot}`}
                type="date"
                defaultValue={slot.effectiveTo ?? ""}
              />
            </div>
          </div>
        </fieldset>
      ))}
      <SubmitButton idleLabel={submitLabel} pendingLabel="Saving…" />
    </form>
  );
}
