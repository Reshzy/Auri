import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="border-auri-border bg-auri-surface/95 rounded-3xl border p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h1 className="text-auri-ink text-2xl font-semibold">{title}</h1>
        <p className="text-auri-ink-muted text-sm">{description}</p>
      </div>
      <div className="mt-6 space-y-4">{children}</div>
      {footer ? <div className="text-auri-ink-muted mt-6 text-sm">{footer}</div> : null}
    </div>
  );
}
