import "server-only";

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "@/db";
import { templateVersions } from "@/db/schema";
import { ExportError } from "@/lib/exports/errors";
import {
  ACCOMPLISHMENT_RUNTIME_FILE,
  ACCOMPLISHMENT_TEMPLATE_ID,
  ACCOMPLISHMENT_TEMPLATE_KEY,
} from "@/lib/templates/accomplishment-tokens";
import {
  DTR_RUNTIME_FILE,
  DTR_TEMPLATE_ID,
  DTR_TEMPLATE_KEY,
} from "@/lib/templates/dtr-cell-map";
import { validateDocxZipStructure } from "@/server/services/docx-structural";
import { validateXlsxZipStructure } from "@/server/services/xlsx-structural";

const MAX_TEMPLATE_BYTES = 5 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type ActiveTemplate = {
  id: string;
  templateKey: string;
  version: number;
  storagePath: string;
  sha256: string;
  fileType: string;
  manifest: Record<string, unknown>;
};

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function readLocalManifest(templateId: string): {
  runtimeSha256: string;
  version: number;
  runtimeFile: string;
} | null {
  const manifestPath = path.join(
    process.cwd(),
    "templates",
    "manifests",
    `${templateId}.json`,
  );
  if (!existsSync(manifestPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      runtimeSha256?: string;
      version?: number;
      runtimeFile?: string;
    };
    if (!raw.runtimeSha256 || typeof raw.version !== "number") return null;
    return {
      runtimeSha256: raw.runtimeSha256,
      version: raw.version,
      runtimeFile: raw.runtimeFile ?? "",
    };
  } catch {
    return null;
  }
}

function readLocalRuntimeBytes(runtimeFile: string): Buffer | null {
  const runtimePath = path.join(process.cwd(), "templates", "runtime", runtimeFile);
  if (!existsSync(runtimePath)) return null;
  return readFileSync(runtimePath);
}

function hasSupabaseStorageConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function downloadFromStorage(storagePath: string): Promise<Buffer> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ExportError("TEMPLATE_NOT_FOUND", "Template storage is not configured.");
  }
  const bucket = process.env.AURI_TEMPLATE_BUCKET || "templates";
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.storage.from(bucket).download(storagePath);
  if (error || !data) {
    throw new ExportError(
      "TEMPLATE_NOT_FOUND",
      "Active template could not be downloaded.",
    );
  }
  return Buffer.from(await data.arrayBuffer());
}

async function getActiveTemplate(templateKey: string): Promise<ActiveTemplate | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(templateVersions)
    .where(
      and(
        eq(templateVersions.templateKey, templateKey),
        eq(templateVersions.isActive, true),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    templateKey: row.templateKey,
    version: row.version,
    storagePath: row.storagePath,
    sha256: row.sha256,
    fileType: row.fileType,
    manifest: (row.manifest ?? {}) as Record<string, unknown>,
  };
}

export async function getActiveAccomplishmentTemplate(): Promise<ActiveTemplate | null> {
  return getActiveTemplate(ACCOMPLISHMENT_TEMPLATE_KEY);
}

export async function getActiveDtrTemplate(): Promise<ActiveTemplate | null> {
  return getActiveTemplate(DTR_TEMPLATE_KEY);
}

async function loadTrustedTemplateBytes(input: {
  templateKey: string;
  templateId: string;
  defaultRuntimeFile: string;
  fileKind: "docx" | "xlsx";
  allowLocalFallback: boolean;
}): Promise<{
  buffer: Buffer;
  sha256: string;
  template: ActiveTemplate | null;
  source: "storage" | "local";
}> {
  const active = await getActiveTemplate(input.templateKey).catch(() => null);
  const localMeta = readLocalManifest(input.templateId);

  let buffer: Buffer | null = null;
  let source: "storage" | "local" = "local";
  let expectedHash = active?.sha256 ?? localMeta?.runtimeSha256 ?? "";

  if (active && hasSupabaseStorageConfig()) {
    try {
      buffer = await downloadFromStorage(active.storagePath);
      source = "storage";
      expectedHash = active.sha256;
    } catch {
      buffer = null;
    }
  }

  if (!buffer && input.allowLocalFallback && localMeta) {
    buffer = readLocalRuntimeBytes(localMeta.runtimeFile || input.defaultRuntimeFile);
    source = "local";
    if (!expectedHash) expectedHash = localMeta.runtimeSha256;
  }

  if (!buffer) {
    throw new ExportError(
      "TEMPLATE_NOT_FOUND",
      input.fileKind === "xlsx"
        ? "DTR runtime template is not available."
        : "Accomplishment runtime template is not available.",
    );
  }

  if (buffer.byteLength > MAX_TEMPLATE_BYTES) {
    throw new ExportError("TEMPLATE_INVALID", "Template exceeds maximum allowed size.");
  }

  const hash = sha256Hex(buffer);
  if (expectedHash && hash !== expectedHash) {
    throw new ExportError(
      "TEMPLATE_HASH_MISMATCH",
      "Template hash does not match the trusted record.",
    );
  }

  if (localMeta && hash !== localMeta.runtimeSha256) {
    throw new ExportError(
      "TEMPLATE_HASH_MISMATCH",
      "Template hash does not match the local manifest.",
    );
  }

  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ExportError(
      "TEMPLATE_INVALID",
      input.fileKind === "xlsx"
        ? "Template is not an XLSX ZIP package."
        : "Template is not a DOCX ZIP package.",
    );
  }

  if (input.fileKind === "docx") {
    const structural = validateDocxZipStructure(buffer, { maxBytes: MAX_TEMPLATE_BYTES });
    if (structural.length > 0) {
      throw new ExportError("TEMPLATE_INVALID", "Template failed structural validation.");
    }
  } else {
    const structural = await validateXlsxZipStructure(buffer, {
      maxBytes: MAX_TEMPLATE_BYTES,
    });
    if (structural.length > 0) {
      throw new ExportError("TEMPLATE_INVALID", "Template failed structural validation.");
    }
  }

  return {
    buffer,
    sha256: hash,
    template: active,
    source,
  };
}

/**
 * Load trusted accomplishment template bytes.
 * Prefers Storage when configured; falls back to local runtime file when hashes match.
 */
export async function loadAccomplishmentTemplateBytes(options?: {
  allowLocalFallback?: boolean;
}): Promise<{
  buffer: Buffer;
  sha256: string;
  template: ActiveTemplate | null;
  source: "storage" | "local";
}> {
  return loadTrustedTemplateBytes({
    templateKey: ACCOMPLISHMENT_TEMPLATE_KEY,
    templateId: ACCOMPLISHMENT_TEMPLATE_ID,
    defaultRuntimeFile: ACCOMPLISHMENT_RUNTIME_FILE,
    fileKind: "docx",
    allowLocalFallback: options?.allowLocalFallback ?? true,
  });
}

/**
 * Load trusted DTR XLSX template bytes.
 * Prefers Storage when configured; falls back to local runtime file when hashes match.
 * Documented local fallback: development/tests (and intentional bundled-template deploys).
 */
export async function loadDtrTemplateBytes(options?: {
  allowLocalFallback?: boolean;
}): Promise<{
  buffer: Buffer;
  sha256: string;
  template: ActiveTemplate | null;
  source: "storage" | "local";
}> {
  return loadTrustedTemplateBytes({
    templateKey: DTR_TEMPLATE_KEY,
    templateId: DTR_TEMPLATE_ID,
    defaultRuntimeFile: DTR_RUNTIME_FILE,
    fileKind: "xlsx",
    allowLocalFallback: options?.allowLocalFallback ?? true,
  });
}

export const TemplateService = {
  getActiveAccomplishmentTemplate,
  getActiveDtrTemplate,
  loadAccomplishmentTemplateBytes,
  loadDtrTemplateBytes,
  DOCX_MIME,
  XLSX_MIME,
  MAX_TEMPLATE_BYTES,
};
