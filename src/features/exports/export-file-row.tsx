import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  formatExportFreshness,
  formatExportTemplateLabels,
} from "@/lib/exports/history-labels";
import type { ExportHistoryItem } from "@/lib/exports/types";
import { cn } from "@/lib/utils";

export function ExportFileRow({
  item,
  actions,
  variant = "panel",
}: {
  item: ExportHistoryItem;
  actions?: ReactNode;
  variant?: "plain" | "panel";
}) {
  const freshness = item.downloadable
    ? formatExportFreshness(item.presentationStatus)
    : "Unavailable";
  const freshnessClass = !item.downloadable
    ? "text-auri-ink-muted"
    : item.presentationStatus === "current"
      ? "text-auri-success"
      : "text-auri-warning";

  return (
    <li
      className={cn(
        "flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between",
        variant === "panel" ? "border-auri-border rounded-2xl border px-4 py-3" : "py-2",
      )}
    >
      <div className="min-w-0">
        <p className="text-auri-ink truncate font-medium">
          {item.format.toUpperCase()} · {item.fileName}
        </p>
        <p className="text-auri-ink-muted wrap-break-word">
          {item.createdAtLabel} · {item.fileSizeLabel} ·{" "}
          {formatExportTemplateLabels(item.templates)}
        </p>
        <p>
          <span className={freshnessClass}>{freshness}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {item.downloadable ? (
          <Button asChild variant="secondary">
            <a href={item.downloadUrl}>Download</a>
          </Button>
        ) : (
          <span className="text-auri-ink-muted text-sm">Download unavailable</span>
        )}
        {actions}
      </div>
    </li>
  );
}
