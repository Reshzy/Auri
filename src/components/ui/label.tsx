import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.ComponentProps<"label">;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label className={cn("text-auri-ink text-sm font-medium", className)} {...props} />
  );
}
