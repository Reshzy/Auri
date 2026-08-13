import JSZip from "jszip";
import { isUnsafeZipEntryName } from "@/server/services/xlsx-zip-safety";
import { MAX_ZIP_COMPRESSED_BYTES, MAX_ZIP_OUTPUT_BYTES } from "@/lib/exports/mime";

export type ZipEntryIssue = {
  code: string;
  message: string;
};

export function isUnsafeFlatZipEntryName(name: string): boolean {
  if (isUnsafeZipEntryName(name)) return true;
  if (name.includes("/")) return true;
  if (name.endsWith("/")) return true;
  return false;
}

export function validateFlatZipEntryNames(names: string[]): ZipEntryIssue[] {
  const issues: ZipEntryIssue[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (isUnsafeFlatZipEntryName(name)) {
      issues.push({ code: "ZIP_UNSAFE_ENTRY", message: "Unsafe ZIP entry name." });
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      issues.push({ code: "ZIP_DUPLICATE", message: "Duplicate ZIP entry name." });
    }
    seen.add(key);
  }
  return issues;
}

export type ZipMemberInput = {
  fileName: string;
  buffer: Buffer;
  sha256: string;
};

export async function validateGeneratedReportPackage(
  zipBuffer: Buffer,
  expected: { docx: ZipMemberInput; xlsx: ZipMemberInput },
): Promise<ZipEntryIssue[]> {
  const issues: ZipEntryIssue[] = [];
  if (zipBuffer.byteLength > MAX_ZIP_OUTPUT_BYTES) {
    issues.push({
      code: "ZIP_TOO_LARGE",
      message: "ZIP exceeds uncompressed size limit.",
    });
  }
  if (zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4b) {
    issues.push({ code: "ZIP_INVALID", message: "Output is not a ZIP package." });
    return issues;
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    issues.push({ code: "ZIP_INVALID", message: "ZIP could not be reopened." });
    return issues;
  }

  const files = Object.keys(zip.files).filter((name) => {
    const entry = zip.files[name];
    return Boolean(entry) && !entry!.dir;
  });

  issues.push(...validateFlatZipEntryNames(files));

  if (files.length !== 2) {
    issues.push({
      code: "ZIP_ENTRY_COUNT",
      message: "ZIP must contain exactly two files.",
    });
  }

  const expectedNames = new Set([expected.docx.fileName, expected.xlsx.fileName]);
  for (const name of files) {
    if (!expectedNames.has(name)) {
      issues.push({
        code: "ZIP_UNEXPECTED_ENTRY",
        message: "ZIP contains an unexpected file.",
      });
    }
  }

  for (const member of [expected.docx, expected.xlsx]) {
    const entry = zip.file(member.fileName);
    if (!entry || entry.dir) {
      issues.push({
        code: "ZIP_MISSING_MEMBER",
        message: "ZIP is missing an expected member.",
      });
      continue;
    }
    const bytes = Buffer.from(await entry.async("uint8array"));
    if (bytes.byteLength !== member.buffer.byteLength) {
      issues.push({
        code: "ZIP_MEMBER_SIZE",
        message: "ZIP member size does not match.",
      });
    }
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== member.sha256) {
      issues.push({
        code: "ZIP_MEMBER_HASH",
        message: "ZIP member hash does not match.",
      });
    }
  }

  return issues;
}

export function assertZipCompressedSize(byteLength: number): void {
  if (byteLength > MAX_ZIP_COMPRESSED_BYTES) {
    throw new Error("ZIP exceeds compressed size limit.");
  }
}
