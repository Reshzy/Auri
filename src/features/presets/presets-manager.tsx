"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage, SubmitButton } from "@/features/settings/form-status";
import {
  createPresetAction,
  deactivatePresetAction,
  seedStarterPresetsAction,
  updatePresetAction,
  type PresetActionState,
} from "@/features/presets/actions";
import type { PresetListItem } from "@/features/presets/types";
import { filterPresets } from "@/lib/presets/search";
import { orderPresets } from "@/lib/presets/order";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const initialState: PresetActionState = {};

function formatLastUsed(value: string | null): string {
  if (!value) return "Never used";
  try {
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function PresetFields({
  idPrefix,
  defaults,
}: {
  idPrefix: string;
  defaults?: Partial<PresetListItem>;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-label`}>Label</Label>
        <Input
          id={`${idPrefix}-label`}
          name="label"
          required
          maxLength={80}
          defaultValue={defaults?.label ?? ""}
          placeholder="Short name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-content`}>Accomplishment text</Label>
        <textarea
          id={`${idPrefix}-content`}
          name="content"
          required
          maxLength={500}
          defaultValue={defaults?.content ?? ""}
          rows={3}
          className="border-auri-border bg-auri-bg text-auri-ink focus-visible:ring-auri-orange-600/40 w-full rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          placeholder="Full text inserted into the daily entry"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-category`}>Category (optional)</Label>
          <Input
            id={`${idPrefix}-category`}
            name="category"
            maxLength={60}
            defaultValue={defaults?.category ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-shortcut`}>Shortcut (optional)</Label>
          <Input
            id={`${idPrefix}-shortcut`}
            name="shortcut"
            maxLength={16}
            defaultValue={defaults?.shortcut ?? ""}
            placeholder="e.g. vis"
            autoComplete="off"
          />
          <p className="text-auri-ink-muted text-xs">
            Stored lowercase. Unique per your account.
          </p>
        </div>
      </div>
    </div>
  );
}

function CreatePresetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(createPresetAction, initialState);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
      router.refresh();
    }
  }, [state.success, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="create-preset-desc">
        <DialogTitle>Create preset</DialogTitle>
        <DialogDescription id="create-preset-desc">
          Save a reusable accomplishment phrase for faster daily entry.
        </DialogDescription>
        <form className="mt-4 space-y-4" action={formAction} noValidate>
          <FormMessage error={state.error} success={state.success} />
          <PresetFields idPrefix="create" />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton idleLabel="Create preset" pendingLabel="Creating…" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPresetDialog({
  preset,
  open,
  onOpenChange,
}: {
  preset: PresetListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(updatePresetAction, initialState);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
      router.refresh();
    }
  }, [state.success, onOpenChange, router]);

  if (!preset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="edit-preset-desc">
        <DialogTitle>Edit preset</DialogTitle>
        <DialogDescription id="edit-preset-desc">
          Changes do not rewrite accomplishments already saved in reports.
        </DialogDescription>
        <form className="mt-4 space-y-4" action={formAction} noValidate key={preset.id}>
          <input type="hidden" name="presetId" value={preset.id} />
          <FormMessage error={state.error} success={state.success} />
          <PresetFields idPrefix={`edit-${preset.id}`} defaults={preset} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton idleLabel="Save changes" pendingLabel="Saving…" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeactivatePresetDialog({
  preset,
  open,
  onOpenChange,
}: {
  preset: PresetListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(deactivatePresetAction, initialState);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
      router.refresh();
    }
  }, [state.success, onOpenChange, router]);

  if (!preset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="deactivate-preset-desc">
        <DialogTitle>Deactivate preset?</DialogTitle>
        <DialogDescription id="deactivate-preset-desc">
          “{preset.label}” will be hidden from the picker. Usage history is kept; this is
          not a hard delete.
        </DialogDescription>
        <form className="mt-4 space-y-4" action={formAction}>
          <input type="hidden" name="presetId" value={preset.id} />
          <input type="hidden" name="confirm" value="yes" />
          <FormMessage error={state.error} success={state.success} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton
              idleLabel="Deactivate"
              pendingLabel="Deactivating…"
              variant="secondary"
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SeedStartersForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(seedStarterPresetsAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-3">
      <FormMessage error={state.error} success={state.success} />
      <SubmitButton idleLabel="Add starter presets" pendingLabel="Adding…" />
    </form>
  );
}

export function PresetsManager({ initialPresets }: { initialPresets: PresetListItem[] }) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editPreset, setEditPreset] = useState<PresetListItem | null>(null);
  const [deactivatePreset, setDeactivatePreset] = useState<PresetListItem | null>(null);

  const visible = useMemo(() => {
    return filterPresets(orderPresets(initialPresets), query);
  }, [initialPresets, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 sm:max-w-md sm:flex-1">
          <Label htmlFor="preset-search">Search presets</Label>
          <Input
            id="preset-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Label, content, category, or shortcut"
            autoComplete="off"
          />
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create preset
        </Button>
      </div>

      {initialPresets.length === 0 ? (
        <EmptyState
          title="No presets yet"
          description="Add the five sample office phrases, or create your own reusable accomplishments."
          action={<SeedStartersForm />}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try a different search, or clear the filter."
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((preset) => (
            <li
              key={preset.id}
              className="border-auri-border bg-auri-surface rounded-3xl border p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-auri-ink text-lg font-semibold">
                      {preset.label}
                    </h3>
                    {preset.shortcut ? (
                      <span
                        className={cn(
                          "border-auri-border bg-auri-bg text-auri-ink-muted rounded-lg border px-2 py-0.5 font-mono text-xs",
                        )}
                      >
                        {preset.shortcut}
                      </span>
                    ) : null}
                    {preset.category ? (
                      <span className="text-auri-ink-muted text-xs">
                        {preset.category}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-auri-ink text-sm whitespace-pre-wrap">
                    {preset.content}
                  </p>
                  <p className="text-auri-ink-muted text-xs">
                    Used {preset.useCount} time{preset.useCount === 1 ? "" : "s"} ·{" "}
                    {formatLastUsed(preset.lastUsedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditPreset(preset)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeactivatePreset(preset)}
                  >
                    Deactivate
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CreatePresetDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditPresetDialog
        preset={editPreset}
        open={Boolean(editPreset)}
        onOpenChange={(open) => {
          if (!open) setEditPreset(null);
        }}
      />
      <DeactivatePresetDialog
        preset={deactivatePreset}
        open={Boolean(deactivatePreset)}
        onOpenChange={(open) => {
          if (!open) setDeactivatePreset(null);
        }}
      />
    </div>
  );
}
