import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "border-auri-border bg-auri-surface text-auri-ink placeholder:text-auri-ink-muted/70 flex h-11 w-full rounded-xl border px-3 py-2 text-sm",
        "focus-visible:border-auri-orange-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
