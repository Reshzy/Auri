"use client";

import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) {
    return null;
  }
  return <Alert tone={error ? "danger" : "success"}>{error ?? success}</Alert>;
}

export function SubmitButton({
  idleLabel,
  pendingLabel,
  variant = "primary",
}: {
  idleLabel: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className="w-full sm:w-auto"
    >
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
