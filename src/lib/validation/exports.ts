import { z } from "zod";

export const exportFormatSchema = z.enum(["docx", "xlsx", "zip"]);

export type ExportFormat = z.infer<typeof exportFormatSchema>;

const REJECTED_OWNERSHIP_KEYS = [
  "userId",
  "user_id",
  "ownerId",
  "owner_id",
  "clerkUserId",
  "clerk_user_id",
  "authUserId",
  "auth_user_id",
  "profileId",
  "profile_id",
  "storagePath",
  "storage_path",
  "exportId",
  "export_id",
  "templateVersionId",
  "template_version_id",
  "sha256",
  "fileName",
  "file_name",
] as const;

export const exportRequestSchema = z
  .object({
    formats: z.array(exportFormatSchema).min(1),
    acknowledgedWarnings: z.array(z.string()).default([]),
    userId: z.unknown().optional(),
    user_id: z.unknown().optional(),
    ownerId: z.unknown().optional(),
    owner_id: z.unknown().optional(),
    clerkUserId: z.unknown().optional(),
    clerk_user_id: z.unknown().optional(),
    authUserId: z.unknown().optional(),
    auth_user_id: z.unknown().optional(),
    profileId: z.unknown().optional(),
    profile_id: z.unknown().optional(),
    storagePath: z.unknown().optional(),
    storage_path: z.unknown().optional(),
    exportId: z.unknown().optional(),
    export_id: z.unknown().optional(),
    templateVersionId: z.unknown().optional(),
    template_version_id: z.unknown().optional(),
    sha256: z.unknown().optional(),
    fileName: z.unknown().optional(),
    file_name: z.unknown().optional(),
  })
  .strict();

export type ExportRequestInput = z.infer<typeof exportRequestSchema>;

export function hasRejectedOwnershipField(body: Record<string, unknown>): boolean {
  for (const key of REJECTED_OWNERSHIP_KEYS) {
    const value = body[key];
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      return true;
    }
  }
  return false;
}

export function normalizeRequestedFormats(
  formats: ExportFormat[],
): { ok: true; formats: ExportFormat[] } | { ok: false; reason: string } {
  if (formats.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (new Set(formats).size !== formats.length) {
    return { ok: false, reason: "duplicate" };
  }
  if (
    formats.includes("zip") &&
    (!formats.includes("docx") || !formats.includes("xlsx"))
  ) {
    return { ok: false, reason: "zip-dependency" };
  }
  const order: ExportFormat[] = ["docx", "xlsx", "zip"];
  return { ok: true, formats: order.filter((format) => formats.includes(format)) };
}
