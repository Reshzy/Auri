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
import { ExportFileRow } from "@/features/exports/export-file-row";
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
          <ExportFileRow
            key={item.id}
            item={item}
            actions={
              <Button size="sm" variant="ghost" onClick={() => setConfirmId(item.id)}>
                Delete
              </Button>
            }
          />
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
