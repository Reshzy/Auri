"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <EmptyState
        title="No generated files yet"
        description="Use Generate to create Word, Excel, or a ZIP package. Files stay private to your account."
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert tone="danger">
          {error}{" "}
          <button type="button" className="underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </Alert>
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
              <Button size="sm" variant="ghost" onClick={() => setConfirmId(item.id)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        open={Boolean(confirmId)}
        onOpenChange={(open) => !open && setConfirmId(null)}
      >
        <DialogContent>
          <DialogTitle>Delete this file?</DialogTitle>
          <DialogDescription>
            The download will be removed from your history. You can generate the report
            again later.
          </DialogDescription>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!confirmId || busyId === confirmId}
              onClick={() => confirmId && void onDelete(confirmId)}
            >
              {busyId === confirmId ? "Deleting…" : "Delete file"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
