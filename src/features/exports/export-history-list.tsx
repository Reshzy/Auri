"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ExportHistoryItem } from "@/lib/exports/types";

export function ExportHistoryList({
  reportId,
  initialItems,
}: {
  reportId: string;
  initialItems: ExportHistoryItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/reports/${reportId}/exports`, { cache: "no-store" });
    if (!res.ok) throw new Error("HISTORY_FAILED");
    const json = (await res.json()) as { items: ExportHistoryItem[] };
    setItems(json.items);
  }

  async function onDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/exports/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        throw new Error("DELETE_FAILED");
      }
      setConfirmId(null);
      await refresh();
    } catch {
      setError("Could not delete that file. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-auri-ink-muted text-sm">
        No generated files yet. Use Generate to create Word, Excel, or a ZIP package.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-auri-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="border-auri-border flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-auri-ink font-medium">
                {item.format.toUpperCase()} · {item.fileName}
              </p>
              <p className="text-auri-ink-muted">
                {item.createdAtLabel} · {item.fileSizeLabel} ·{" "}
                {item.templates
                  .map((template) =>
                    template.version != null
                      ? `${template.key} v${template.version}`
                      : template.key,
                  )
                  .join(" + ") || "Template unknown"}
              </p>
              <p>
                <span
                  className={
                    item.presentationStatus === "current"
                      ? "text-auri-success"
                      : "text-auri-warning"
                  }
                >
                  {item.presentationStatus === "current" ? "Current" : "Outdated"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.downloadable ? (
                <Button asChild size="sm" variant="secondary">
                  <a href={item.downloadUrl}>Download</a>
                </Button>
              ) : (
                <span className="text-auri-ink-muted text-xs">Download unavailable</span>
              )}
              {confirmId === item.id ? (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === item.id}
                    onClick={() => void onDelete(item.id)}
                  >
                    {busyId === item.id ? "Deleting…" : "Confirm delete"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmId(item.id)}>
                  Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
