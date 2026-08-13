import "server-only";

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ExportError } from "@/lib/exports/errors";
import {
  filenameMatchesFormat,
  maxBytesForFormat,
  mimeTypeForFormat,
  type ExportFormat,
} from "@/lib/exports/mime";
import { parseGeneratedStoragePath } from "@/lib/exports/storage-path";
import { hasSupabaseStorageConfig } from "@/lib/env";

export const GENERATED_REPORTS_BUCKET = "generated-reports";

export type UploadedObjectMeta = {
  path: string;
  byteLength: number;
  sha256: string;
  contentType: string;
};

export type GeneratedStorage = {
  bucket: string;
  isConfigured(): boolean;
  isPublic(): Promise<boolean>;
  upload(input: {
    path: string;
    bytes: Buffer;
    contentType: string;
    format: ExportFormat;
    expectedSha256: string;
  }): Promise<UploadedObjectMeta>;
  download(path: string): Promise<Buffer | null>;
  exists(path: string): Promise<boolean>;
  head(path: string): Promise<{ byteLength: number } | null>;
  removeExact(path: string): Promise<"deleted" | "absent">;
};

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function opaqueOrphanRef(path: string): string {
  return sha256Hex(Buffer.from(path, "utf8")).slice(0, 16);
}

function assertUploadContract(input: {
  path: string;
  bytes: Buffer;
  contentType: string;
  format: ExportFormat;
  expectedSha256: string;
}): void {
  if (!parseGeneratedStoragePath(input.path)) {
    throw new ExportError("EXPORT_INTEGRITY_FAILED", "Invalid storage path.");
  }
  const fileName = input.path.split("/").pop() ?? "";
  if (!filenameMatchesFormat(fileName, input.format)) {
    throw new ExportError("EXPORT_INTEGRITY_FAILED", "Filename extension mismatch.");
  }
  if (input.contentType !== mimeTypeForFormat(input.format)) {
    throw new ExportError("EXPORT_INTEGRITY_FAILED", "MIME type mismatch.");
  }
  if (
    input.bytes.byteLength <= 0 ||
    input.bytes.byteLength > maxBytesForFormat(input.format)
  ) {
    throw new ExportError("EXPORT_INTEGRITY_FAILED", "Generated file size is invalid.");
  }
  const hash = sha256Hex(input.bytes);
  if (hash !== input.expectedSha256) {
    throw new ExportError("EXPORT_INTEGRITY_FAILED", "Generated file hash mismatch.");
  }
}

export function createMemoryGeneratedStorage(): GeneratedStorage & {
  objects: Map<string, { bytes: Buffer; contentType: string }>;
} {
  const objects = new Map<string, { bytes: Buffer; contentType: string }>();
  return {
    bucket: GENERATED_REPORTS_BUCKET,
    objects,
    isConfigured() {
      return true;
    },
    async isPublic() {
      return false;
    },
    async upload(input) {
      assertUploadContract(input);
      const existing = objects.get(input.path);
      if (existing) {
        const existingHash = sha256Hex(existing.bytes);
        if (existingHash !== input.expectedSha256) {
          throw new ExportError(
            "EXPORT_INTEGRITY_FAILED",
            "Refusing to overwrite an existing object with different bytes.",
          );
        }
        return {
          path: input.path,
          byteLength: existing.bytes.byteLength,
          sha256: existingHash,
          contentType: existing.contentType,
        };
      }
      objects.set(input.path, {
        bytes: Buffer.from(input.bytes),
        contentType: input.contentType,
      });
      return {
        path: input.path,
        byteLength: input.bytes.byteLength,
        sha256: input.expectedSha256,
        contentType: input.contentType,
      };
    },
    async download(path) {
      const found = objects.get(path);
      return found ? Buffer.from(found.bytes) : null;
    },
    async exists(path) {
      return objects.has(path);
    },
    async head(path) {
      const found = objects.get(path);
      return found ? { byteLength: found.bytes.byteLength } : null;
    },
    async removeExact(path) {
      if (!objects.has(path)) return "absent";
      objects.delete(path);
      return "deleted";
    },
  };
}

function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ExportError(
      "EXPORT_STORAGE_FAILED",
      "Generated-report storage is not configured.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseGeneratedStorage(): GeneratedStorage {
  return {
    bucket: process.env.AURI_GENERATED_BUCKET || GENERATED_REPORTS_BUCKET,
    isConfigured() {
      return hasSupabaseStorageConfig();
    },
    async isPublic() {
      const client = createSupabaseAdmin();
      const { data, error } = await client.storage.getBucket(this.bucket);
      if (error || !data) {
        throw new ExportError(
          "EXPORT_STORAGE_FAILED",
          "Could not inspect generated-reports bucket.",
        );
      }
      return Boolean(data.public);
    },
    async upload(input) {
      assertUploadContract(input);
      if (!this.isConfigured()) {
        throw new ExportError(
          "EXPORT_STORAGE_FAILED",
          "Generated-report storage is not configured.",
        );
      }
      const client = createSupabaseAdmin();
      const existing = await client.storage.from(this.bucket).download(input.path);
      if (existing.data && !existing.error) {
        const existingBytes = Buffer.from(await existing.data.arrayBuffer());
        const existingHash = sha256Hex(existingBytes);
        if (existingHash !== input.expectedSha256) {
          throw new ExportError(
            "EXPORT_INTEGRITY_FAILED",
            "Refusing to overwrite an existing object with different bytes.",
          );
        }
        return {
          path: input.path,
          byteLength: existingBytes.byteLength,
          sha256: existingHash,
          contentType: input.contentType,
        };
      }

      const { error } = await client.storage
        .from(this.bucket)
        .upload(input.path, input.bytes, {
          contentType: input.contentType,
          upsert: false,
        });
      if (error) {
        throw new ExportError(
          "EXPORT_STORAGE_FAILED",
          "Generated file could not be stored.",
          {
            cause: error,
          },
        );
      }

      const verified = await client.storage.from(this.bucket).download(input.path);
      if (verified.error || !verified.data) {
        throw new ExportError(
          "EXPORT_INTEGRITY_FAILED",
          "Uploaded object could not be verified.",
        );
      }
      const verifiedBytes = Buffer.from(await verified.data.arrayBuffer());
      const verifiedHash = sha256Hex(verifiedBytes);
      if (
        verifiedBytes.byteLength !== input.bytes.byteLength ||
        verifiedHash !== input.expectedSha256
      ) {
        throw new ExportError(
          "EXPORT_INTEGRITY_FAILED",
          "Uploaded object failed hash verification.",
        );
      }
      return {
        path: input.path,
        byteLength: verifiedBytes.byteLength,
        sha256: verifiedHash,
        contentType: input.contentType,
      };
    },
    async download(path) {
      if (!this.isConfigured()) return null;
      const client = createSupabaseAdmin();
      const { data, error } = await client.storage.from(this.bucket).download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
    async exists(path) {
      const head = await this.head(path);
      return head !== null;
    },
    async head(path) {
      const bytes = await this.download(path);
      return bytes ? { byteLength: bytes.byteLength } : null;
    },
    async removeExact(path) {
      if (!parseGeneratedStoragePath(path)) {
        throw new ExportError("EXPORT_DELETE_FAILED", "Invalid storage path.");
      }
      if (!this.isConfigured()) {
        throw new ExportError(
          "EXPORT_STORAGE_FAILED",
          "Generated-report storage is not configured.",
        );
      }
      const client = createSupabaseAdmin();
      const existing = await this.exists(path);
      if (!existing) return "absent";
      const { error } = await client.storage.from(this.bucket).remove([path]);
      if (error) {
        throw new ExportError(
          "EXPORT_DELETE_FAILED",
          "Storage object could not be deleted.",
          {
            cause: error,
          },
        );
      }
      return "deleted";
    },
  };
}

let injected: GeneratedStorage | null = null;

export function setGeneratedStorageForTests(storage: GeneratedStorage | null): void {
  injected = storage;
}

export function getGeneratedStorage(): GeneratedStorage {
  if (injected) return injected;
  return createSupabaseGeneratedStorage();
}

export function logOrphanCompensationFailure(correlationId: string, path: string): void {
  console.error("export_storage_orphan", {
    correlationId,
    orphanRef: opaqueOrphanRef(path),
  });
}
