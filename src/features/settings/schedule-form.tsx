"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage, SubmitButton } from "@/features/settings/form-status";
import {
  saveScheduleAction,
  type SettingsActionState,
} from "@/features/settings/actions";
import {
  COMPRESSED_SCHEDULE_NAME,
  STANDARD_SCHEDULE_NAME,
  createCompressedWeekdayRules,
  createStandardWeekdayRules,
} from "@/lib/onboarding/defaults";
import {
  weekdayKeys,
  type WeekdayKey,
  type WeekdayRules,
} from "@/lib/validation/onboarding";

const initialState: SettingsActionState = {};

const DAY_LABELS: Record<WeekdayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function ScheduleForm({
  scheduleId,
  name,
  weekdayRules,
  nextStep,
  submitLabel = "Save schedule",
}: {
  scheduleId: string | null;
  name: string;
  weekdayRules: WeekdayRules;
  nextStep?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(saveScheduleAction, initialState);
  const [rules, setRules] = useState<WeekdayRules>(weekdayRules);
  const [scheduleName, setScheduleName] = useState(name);
  const rulesJson = useMemo(() => JSON.stringify(rules), [rules]);

  function applyCompressed() {
    setScheduleName(COMPRESSED_SCHEDULE_NAME);
    setRules(createCompressedWeekdayRules());
  }

  function applyStandard() {
    setScheduleName(STANDARD_SCHEDULE_NAME);
    setRules(createStandardWeekdayRules());
  }

  function updateDay(day: WeekdayKey, patch: Partial<WeekdayRules[WeekdayKey]>) {
    setRules((current) => ({
      ...current,
      [day]: { ...current[day], ...patch },
    }));
  }

  return (
    <form className="space-y-4" action={formAction} noValidate>
      {nextStep ? <input type="hidden" name="nextStep" value={nextStep} /> : null}
      {scheduleId ? <input type="hidden" name="scheduleId" value={scheduleId} /> : null}
      <input type="hidden" name="weekdayRulesJson" value={rulesJson} />
      <FormMessage error={state.error} success={state.success} />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={applyCompressed}>
          Compressed four-day
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={applyStandard}>
          Standard five-day
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Schedule name</Label>
        <Input
          id="name"
          name="name"
          value={scheduleName}
          onChange={(event) => setScheduleName(event.target.value)}
          required
        />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-auri-ink text-sm font-medium">Weekday rules</legend>
        {weekdayKeys.map((day) => {
          const rule = rules[day];
          return (
            <div
              key={day}
              className="border-auri-border bg-auri-orange-50/30 space-y-3 rounded-2xl border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-auri-ink text-sm font-medium">{DAY_LABELS[day]}</p>
                <label className="text-auri-ink-muted flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={rule.isWorkday}
                    onChange={(event) =>
                      updateDay(day, {
                        isWorkday: event.target.checked,
                        offDayLabel: event.target.checked
                          ? null
                          : (rule.offDayLabel ?? DAY_LABELS[day].toUpperCase()),
                        amStart: event.target.checked ? (rule.amStart ?? "08:00") : null,
                        amEnd: event.target.checked ? (rule.amEnd ?? "12:00") : null,
                        pmStart: event.target.checked ? (rule.pmStart ?? "13:00") : null,
                        pmEnd: event.target.checked ? (rule.pmEnd ?? "17:00") : null,
                      })
                    }
                  />
                  Workday
                </label>
              </div>
              {rule.isWorkday ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["amStart", "AM start"],
                      ["amEnd", "AM end"],
                      ["pmStart", "PM start"],
                      ["pmEnd", "PM end"],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <Label htmlFor={`${day}-${field}`} className="text-xs">
                        {label}
                      </Label>
                      <Input
                        id={`${day}-${field}`}
                        type="time"
                        value={rule[field] ?? ""}
                        onChange={(event) =>
                          updateDay(day, { [field]: event.target.value || null })
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor={`${day}-off`}>Off-day label</Label>
                  <Input
                    id={`${day}-off`}
                    value={rule.offDayLabel ?? ""}
                    onChange={(event) =>
                      updateDay(day, { offDayLabel: event.target.value || null })
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </fieldset>

      <SubmitButton idleLabel={submitLabel} pendingLabel="Saving…" />
    </form>
  );
}
