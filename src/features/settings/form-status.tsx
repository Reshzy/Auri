"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) {
    return null;
  }
  return (
    <div
      role={error ? "alert" : "status"}
      aria-live="polite"
      className={
        error
          ? "border-auri-danger/30 bg-auri-danger/10 text-auri-danger rounded-xl border px-3 py-2 text-sm"
          : "border-auri-success/30 bg-auri-success/10 text-auri-success rounded-xl border px-3 py-2 text-sm"
      }
    >
      {error ?? success}
    </div>
  );
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
