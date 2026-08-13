export type ZipBundleMember = {
  format: "docx" | "xlsx";
  exportId: string;
  fileName: string;
  sha256: string;
  fileSizeBytes: number;
  templateVersionId: string;
  templateSha256: string;
};

export type ZipBundleManifest = {
  version: 1;
  members: [ZipBundleMember, ZipBundleMember];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_RE = /^[a-f0-9]{64}$/i;

export function isZipBundleManifest(value: unknown): value is ZipBundleManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) return false;
  if (!Array.isArray(raw.members) || raw.members.length !== 2) return false;
  const formats = new Set<string>();
  for (const member of raw.members) {
    if (!isZipBundleMember(member)) return false;
    formats.add(member.format);
  }
  return formats.has("docx") && formats.has("xlsx");
}

function isZipBundleMember(value: unknown): value is ZipBundleMember {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  if (raw.format !== "docx" && raw.format !== "xlsx") return false;
  if (typeof raw.exportId !== "string" || !UUID_RE.test(raw.exportId)) return false;
  if (
    typeof raw.fileName !== "string" ||
    raw.fileName.includes("/") ||
    raw.fileName.includes("\\")
  ) {
    return false;
  }
  if (typeof raw.sha256 !== "string" || !SHA_RE.test(raw.sha256)) return false;
  if (
    typeof raw.fileSizeBytes !== "number" ||
    !Number.isInteger(raw.fileSizeBytes) ||
    raw.fileSizeBytes < 0
  ) {
    return false;
  }
  if (typeof raw.templateVersionId !== "string" || !UUID_RE.test(raw.templateVersionId)) {
    return false;
  }
  if (typeof raw.templateSha256 !== "string" || !SHA_RE.test(raw.templateSha256)) {
    return false;
  }
  return true;
}

export function buildZipBundleManifest(members: {
  docx: ZipBundleMember;
  xlsx: ZipBundleMember;
}): ZipBundleManifest {
  if (members.docx.format !== "docx" || members.xlsx.format !== "xlsx") {
    throw new Error("ZIP manifest members must be docx then xlsx.");
  }
  return {
    version: 1,
    members: [members.docx, members.xlsx],
  };
}

export function zipManifestMember(
  format: "docx" | "xlsx",
  manifest: ZipBundleManifest,
): ZipBundleMember {
  const found = manifest.members.find((member) => member.format === format);
  if (!found) {
    throw new Error(`ZIP manifest is missing ${format} member.`);
  }
  return found;
}
