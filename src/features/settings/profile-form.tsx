"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage, SubmitButton } from "@/features/settings/form-status";
import { saveProfileAction, type SettingsActionState } from "@/features/settings/actions";

const initialState: SettingsActionState = {};

export type ProfileFormValues = {
  employeeName: string;
  employeeTitle: string;
  organizationName: string;
  officeName: string;
  departmentName: string;
  timezone: string;
  locale: string;
};

export function ProfileForm({
  values,
  nextStep,
  submitLabel = "Save profile",
}: {
  values: ProfileFormValues;
  nextStep?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(saveProfileAction, initialState);

  return (
    <form className="space-y-4" action={formAction} noValidate>
      {nextStep ? <input type="hidden" name="nextStep" value={nextStep} /> : null}
      <FormMessage error={state.error} success={state.success} />
      <div className="space-y-2">
        <Label htmlFor="employeeName">Employee full name</Label>
        <Input
          id="employeeName"
          name="employeeName"
          defaultValue={values.employeeName}
          required
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="employeeTitle">Title / role</Label>
        <Input
          id="employeeTitle"
          name="employeeTitle"
          defaultValue={values.employeeTitle}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="organizationName">Municipality / organization</Label>
        <Input
          id="organizationName"
          name="organizationName"
          defaultValue={values.organizationName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="officeName">Office</Label>
        <Input
          id="officeName"
          name="officeName"
          defaultValue={values.officeName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="departmentName">Department</Label>
        <Input
          id="departmentName"
          name="departmentName"
          defaultValue={values.departmentName}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={values.timezone} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locale">Locale</Label>
          <Input id="locale" name="locale" defaultValue={values.locale} required />
        </div>
      </div>
      <SubmitButton idleLabel={submitLabel} pendingLabel="Saving…" />
    </form>
  );
}
