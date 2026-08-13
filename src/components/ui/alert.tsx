import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger";

const toneClass: Record<AlertTone, string> = {
  info: "border-auri-border bg-auri-orange-50/60 text-auri-ink",
  success: "border-auri-success/30 bg-auri-success/10 text-auri-success",
  warning: "border-auri-warning/30 bg-auri-warning/10 text-auri-warning",
  danger: "border-auri-danger/30 bg-auri-danger/10 text-auri-danger",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const role = tone === "danger" ? "alert" : "status";

  return (
    <div
      role={role}
      aria-live={tone === "danger" ? "assertive" : "polite"}
      className={cn("rounded-xl border px-3 py-2 text-sm", toneClass[tone], className)}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
