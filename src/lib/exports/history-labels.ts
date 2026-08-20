import type { HistoryTemplateLabel } from "@/lib/exports/types";

export function formatExportTemplateLabels(templates: HistoryTemplateLabel[]): string {
  const labels = templates.map((template) =>
    template.version != null ? `${template.key} v${template.version}` : template.key,
  );
  return labels.join(" + ") || "Template unknown";
}

export function formatExportFreshness(status: "current" | "outdated"): string {
  return status === "current" ? "Current" : "Outdated";
}
