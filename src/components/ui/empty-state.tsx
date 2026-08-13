import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-auri-border bg-auri-surface rounded-3xl border p-6",
        className,
      )}
    >
      <p className="text-auri-ink font-medium">{title}</p>
      <p className="text-auri-ink-muted mt-1 text-sm">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
