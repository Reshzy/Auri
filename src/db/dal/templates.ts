import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { templateVersions } from "@/db/schema";
import type {
  TemplateAvailabilityItem,
  TemplateKey,
} from "@/lib/templates/availability-types";

export type { TemplateAvailabilityItem, TemplateKey };

const MANIFEST_FILES: Record<
  TemplateKey,
  { manifest: string; label: string; fileType: "docx" | "xlsx" }
> = {
  accomplishment: {
    manifest: "accomplishment-report-v1.json",
    label: "Accomplishment report (DOCX)",
    fileType: "docx",
  },
  dtr: {
    manifest: "dtr-csc-form-48-v1.json",
    label: "Daily time record (XLSX)",
    fileType: "xlsx",
  },
};

function readManifestAvailability(key: TemplateKey): {
  manifestPresent: boolean;
  sourcePresent: boolean;
  sha256: string | null;
  version: number | null;
} {
  const meta = MANIFEST_FILES[key];
  const manifestPath = path.join(process.cwd(), "templates", "manifests", meta.manifest);
  if (!existsSync(manifestPath)) {
    return {
      manifestPresent: false,
      sourcePresent: false,
      sha256: null,
      version: null,
    };
  }

  try {
    const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      sourceFile?: string;
      sourceSha256?: string;
      version?: number;
    };
    const sourcePath = raw.sourceFile
      ? path.join(process.cwd(), "templates", "source", raw.sourceFile)
      : null;
    return {
      manifestPresent: true,
      sourcePresent: Boolean(sourcePath && existsSync(sourcePath)),
      sha256: raw.sourceSha256 ?? null,
      version: typeof raw.version === "number" ? raw.version : null,
    };
  } catch {
    return {
      manifestPresent: true,
      sourcePresent: false,
      sha256: null,
      version: null,
    };
  }
}

/**
 * Phase 3 availability: active template_versions row and/or audited Phase 0 manifest+source.
 * Does not activate or upload templates (Phase 6).
 */
export async function getTemplateAvailability(): Promise<{
  items: TemplateAvailabilityItem[];
  bothAvailable: boolean;
}> {
  const db = getDb();
  const keys: TemplateKey[] = ["accomplishment", "dtr"];
  const items: TemplateAvailabilityItem[] = [];

  for (const key of keys) {
    const meta = MANIFEST_FILES[key];
    const rows = await db
      .select()
      .from(templateVersions)
      .where(
        and(eq(templateVersions.templateKey, key), eq(templateVersions.isActive, true)),
      )
      .limit(1);
    const active = rows[0] ?? null;
    const local = readManifestAvailability(key);
    const dbActive = Boolean(active);
    const available = dbActive || (local.manifestPresent && local.sourcePresent);

    items.push({
      key,
      label: meta.label,
      fileType: meta.fileType,
      dbActive,
      manifestPresent: local.manifestPresent,
      sourcePresent: local.sourcePresent,
      available,
      version: active?.version ?? local.version,
      sha256: active?.sha256 ?? local.sha256,
    });
  }

  return {
    items,
    bothAvailable: items.every((item) => item.available),
  };
}
