import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { PresetsManager } from "@/features/presets/presets-manager";
import type { PresetListItem } from "@/features/presets/types";
import { hasDatabaseUrl } from "@/lib/env";
import { PresetService } from "@/server/services/preset-service";

export default async function PresetsPage() {
  if (!hasDatabaseUrl()) {
    return (
      <div className="space-y-3">
        <h2 className="text-auri-ink text-2xl font-semibold">Presets</h2>
        <p className="text-auri-ink-muted">Database is not configured.</p>
      </div>
    );
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/sign-in");
  }

  const rows = await PresetService.listActive(user.id);
  const initialPresets: PresetListItem[] = rows.map((row) => ({
    id: row.id,
    label: row.label,
    content: row.content,
    category: row.category,
    shortcut: row.shortcut,
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
  }));

  return (
    <div className="motion-safe-fade-in space-y-6">
      <div>
        <h2 className="text-auri-ink text-3xl font-semibold tracking-tight">Presets</h2>
        <p className="text-auri-ink-muted mt-1 text-sm">
          Reusable accomplishment phrases for faster daily entry. Deactivating hides a
          preset without erasing usage history.
        </p>
      </div>
      <PresetsManager initialPresets={initialPresets} />
    </div>
  );
}
