"use client";

import { useFormStatus } from "react-dom";

type AuthFormStatusProps = {
  idleLabel: string;
  pendingLabel: string;
};

export function AuthSubmitButton({ idleLabel, pendingLabel }: AuthFormStatusProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-auri-orange-600 shadow-auri-orange-600/20 hover:bg-auri-orange-700 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-medium text-white shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
      aria-busy={pending}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function AuthFormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) {
    return null;
  }

  if (error) {
    return (
      <p
        role="alert"
        className="border-auri-danger/30 bg-auri-danger/5 text-auri-danger rounded-xl border px-3 py-2 text-sm"
      >
        {error}
      </p>
    );
  }

  return (
    <p
      role="status"
      className="border-auri-orange-200 bg-auri-orange-50 text-auri-ink rounded-xl border px-3 py-2 text-sm"
    >
      {success}
    </p>
  );
}
