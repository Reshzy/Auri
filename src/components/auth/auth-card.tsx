import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  notice?: ReactNode;
  switcher?: ReactNode;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
  notice,
  switcher,
}: AuthCardProps) {
  return (
    <div className="border-auri-border bg-auri-surface/95 w-full rounded-3xl border p-5 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h1 className="text-auri-ink text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-auri-ink-muted text-sm">{description}</p>
      </div>
      {switcher ? <div className="mt-1">{switcher}</div> : null}
      {notice ? <div className="mt-4">{notice}</div> : null}
      <div className="mt-5 space-y-4 sm:mt-6">{children}</div>
      {footer ? <div className="text-auri-ink-muted mt-6 text-sm">{footer}</div> : null}
    </div>
  );
}
