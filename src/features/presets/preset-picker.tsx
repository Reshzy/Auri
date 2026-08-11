"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PresetListItem } from "@/features/presets/types";
import { filterPresets, findExactShortcutMatch } from "@/lib/presets/search";
import { orderPresets } from "@/lib/presets/order";
import { cn } from "@/lib/utils";

export function PresetPicker({
  presets,
  disabled,
  applying,
  onApply,
  message,
}: {
  presets: PresetListItem[];
  disabled?: boolean;
  applying?: boolean;
  onApply: (presetIds: string[]) => void | Promise<void>;
  message?: string | null;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(() => orderPresets(presets), [presets]);
  const filtered = useMemo(() => filterPresets(ordered, query), [ordered, query]);

  const selectedPresets = useMemo(() => {
    const byId = new Map(ordered.map((p) => [p.id, p]));
    return selectedIds
      .map((id) => byId.get(id))
      .filter((p): p is PresetListItem => Boolean(p));
  }, [ordered, selectedIds]);

  const exactShortcut = useMemo(
    () => findExactShortcutMatch(ordered, query),
    [ordered, query],
  );
  const highlightedIndex = useMemo(() => {
    if (exactShortcut) {
      const idx = filtered.findIndex((p) => p.id === exactShortcut.id);
      if (idx >= 0) return idx;
    }
    if (filtered.length === 0) return 0;
    return Math.min(activeIndex, filtered.length - 1);
  }, [exactShortcut, filtered, activeIndex]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function toggleId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = exactShortcut ?? filtered[highlightedIndex];
      if (target) toggleId(target.id);
    }
  }

  if (presets.length === 0) {
    return (
      <div className="border-auri-border bg-auri-bg rounded-2xl border px-3 py-3 text-sm">
        <p className="text-auri-ink font-medium">No presets yet</p>
        <p className="text-auri-ink-muted mt-1">
          Create reusable phrases on the presets page, then apply them here.
        </p>
        <Link
          href="/app/presets"
          className="text-auri-orange-700 mt-2 inline-block font-medium underline-offset-2 hover:underline"
        >
          Manage presets
        </Link>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${listId}-search`}>Apply presets</Label>
        <Link href="/app/presets" className="text-auri-ink-muted text-xs hover:underline">
          Manage
        </Link>
      </div>
      <div className="relative">
        <Input
          ref={inputRef}
          id={`${listId}-search`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
          disabled={disabled || applying}
          value={query}
          autoComplete="off"
          placeholder="Search label, content, category, or shortcut"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {open ? (
          <ul
            id={`${listId}-listbox`}
            role="listbox"
            aria-multiselectable
            className="border-auri-border bg-auri-surface absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border p-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="text-auri-ink-muted px-3 py-2 text-sm">No matches</li>
            ) : (
              filtered.map((preset, index) => {
                const selected = selectedIds.includes(preset.id);
                return (
                  <li key={preset.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left text-sm",
                        index === highlightedIndex
                          ? "bg-auri-orange-50"
                          : "hover:bg-auri-orange-50/60",
                        selected ? "ring-auri-orange-600/30 ring-1" : null,
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => toggleId(preset.id)}
                    >
                      <span className="text-auri-ink flex flex-wrap items-center gap-2 font-medium">
                        {selected ? "✓ " : null}
                        {preset.label}
                        {preset.shortcut ? (
                          <span className="border-auri-border text-auri-ink-muted rounded border px-1.5 font-mono text-[11px]">
                            {preset.shortcut}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-auri-ink-muted line-clamp-2 text-xs">
                        {preset.content}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      {selectedPresets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="border-auri-border bg-auri-bg text-auri-ink rounded-full border px-3 py-1 text-xs"
              onClick={() => toggleId(preset.id)}
              disabled={disabled || applying}
            >
              {preset.label}
              {preset.shortcut ? ` (${preset.shortcut})` : ""} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || applying || selectedIds.length === 0}
          onClick={() => void onApply(selectedIds)}
        >
          {applying ? "Applying…" : "Apply selected"}
        </Button>
        {selectedIds.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || applying}
            onClick={() => setSelectedIds([])}
          >
            Clear selection
          </Button>
        ) : null}
      </div>
      {message ? (
        <p className="text-auri-ink-muted text-xs" role="status">
          {message}
        </p>
      ) : null}
      <p className="text-auri-ink-muted text-xs">
        Keyboard: type to search, arrows to move, Enter to toggle (exact shortcut match
        preferred), Escape to close. No global shortcut capture.
      </p>
    </div>
  );
}
