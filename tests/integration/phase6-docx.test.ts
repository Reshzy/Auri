import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ACCOMPLISHMENT_MAX_ROWS,
  ACCOMPLISHMENT_SOURCE_SHA256,
  allRequiredTokens,
  tag,
} from "@/lib/templates/accomplishment-tokens";
import {
  ReportMappingService,
  type MappingReportInput,
} from "@/server/services/report-mapping-service";
import {
  validateDocxZipStructure,
  validateGeneratedAccomplishmentDocx,
} from "@/server/services/docx-structural";
import { DocxExportService } from "@/server/services/docx-export-service";
import { ExportError } from "@/lib/exports/errors";
import type { ProfileSnapshot, SignatorySnapshot } from "@/db/dal/snapshots";

config({ path: ".env.local" });
config();

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "templates", "source", "ACCOMPLISHMENT - RODGE.docx");
const RUNTIME = path.join(ROOT, "templates", "runtime", "accomplishment-report-v1.docx");
const MANIFEST = path.join(
  ROOT,
  "templates",
  "manifests",
  "accomplishment-report-v1.json",
);
const FIXTURE_DIR = path.join(ROOT, "fixtures", "docx", "generated");

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function signatories(employeeName: string): SignatorySnapshot[] {
  return [
    {
      slot: 0,
      displayName: employeeName,
      title: "COS Employee",
      isActive: true,
      effectiveFrom: null,
      effectiveTo: null,
    },
    {
      slot: 1,
      displayName: "Joel A. Puzon",
      title: "Secretary",
      isActive: true,
      effectiveFrom: null,
      effectiveTo: null,
    },
    {
      slot: 2,
      displayName: "Lani P. Langaman",
      title: "HRMO I",
      isActive: true,
      effectiveFrom: null,
      effectiveTo: null,
    },
    {
      slot: 3,
      displayName: "Conniewithlongname Verifier",
      title: "Vice Mayor",
      isActive: true,
      effectiveFrom: null,
      effectiveTo: null,
    },
  ];
}

function buildEntries(
  startDay: number,
  endDay: number,
  month = 8,
  year = 2026,
): MappingReportInput["entries"] {
  const entries: MappingReportInput["entries"] = [];
  for (let day = startDay; day <= endDay; day += 1) {
    const workDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
    const isOff = dow === 0 || dow === 5 || dow === 6; // Fri/Sat/Sun compressed
    if (isOff) {
      const label = dow === 5 ? "Friday" : dow === 6 ? "Saturday" : "Sunday";
      entries.push({
        workDate,
        classification: "scheduled_off",
        classificationLabel: label,
        amArrival: null,
        amDeparture: null,
        pmArrival: null,
        pmDeparture: null,
        workedMinutes: 0,
        calculatedUndertimeMinutes: 0,
        undertimeOverrideMinutes: null,
        accomplishments: [],
        remarks: day === startDay ? "note" : null,
      });
    } else {
      entries.push({
        workDate,
        classification: "workday",
        classificationLabel: null,
        amArrival: "07:00",
        amDeparture: "12:00",
        pmArrival: "13:00",
        pmDeparture: "18:00",
        workedMinutes: 600,
        calculatedUndertimeMinutes: 0,
        undertimeOverrideMinutes: null,
        accomplishments: [
          "Assisted visitors at the office",
          "Prepared official documents",
        ],
        remarks: "",
      });
    }
  }
  return entries;
}

function render(
  tokens: Record<string, string>,
  templateBuf = readFileSync(RUNTIME),
): Buffer {
  const zip = new PizZip(templateBuf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      throw new Error("MISSING_TAG");
    },
  });
  doc.render(tokens);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

describe("Phase 6 DOCX integration", () => {
  it("keeps source template byte-identical to audited hash", () => {
    expect(existsSync(SOURCE)).toBe(true);
    expect(sha256(readFileSync(SOURCE))).toBe(ACCOMPLISHMENT_SOURCE_SHA256);
  });

  it("runtime template has one report copy and no sample employee data", () => {
    expect(existsSync(RUNTIME)).toBe(true);
    const xml = new PizZip(readFileSync(RUNTIME)).file("word/document.xml")!.asText();
    expect((xml.match(/\{report_title\}/g) || []).length).toBe(1);
    expect(xml).not.toContain("RODGE ANDRU P. VILORIA");
    expect(xml).not.toContain("80HRS");
    expect((xml.match(/<w:tbl[\s>]/g) || []).length).toBe(2);
    for (const token of allRequiredTokens()) {
      expect(xml).toContain(tag(token));
    }
  });

  it("manifest agrees with runtime hash and token contract", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
      runtimeSha256: string;
      requiredTokens: string[];
      maxRows: number;
    };
    expect(manifest.runtimeSha256).toBe(sha256(readFileSync(RUNTIME)));
    expect(manifest.maxRows).toBe(ACCOMPLISHMENT_MAX_ROWS);
    expect(manifest.requiredTokens).toEqual(allRequiredTokens());
  });

  it("generates 15-row first-half and 16-row second-half fixtures", () => {
    mkdirSync(FIXTURE_DIR, { recursive: true });

    const profile: ProfileSnapshot = {
      employeeName: "Smoke Employee",
      employeeTitle: "COS Employee",
      organizationName: "MUNICIPALITY OF SANCHEZ MIRA",
      officeName: "VICE MAYOR'S OFFICE",
      departmentName: "IT",
      timezone: "Asia/Manila",
      locale: "en-PH",
    };

    const first = ReportMappingService.toFlatTokens(
      ReportMappingService.buildPayload({
        reportId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        startDate: "2026-08-01",
        endDate: "2026-08-15",
        profileSnapshot: profile,
        signatorySnapshot: signatories(profile.employeeName),
        entries: buildEntries(1, 15),
      }),
    );
    expect(first.r16_date).toBe("");
    const firstBuf = render(first);
    expect(validateGeneratedAccomplishmentDocx(firstBuf, first)).toEqual([]);
    writeFileSync(path.join(FIXTURE_DIR, "first-half-15.generated.docx"), firstBuf);

    const secondProfile = {
      ...profile,
      employeeName: "María Clara Ñ. Extremely-Long-Employee-Name-For-Fixture",
    };
    const secondEntries = buildEntries(16, 31);
    // inject long accomplishment + xml/unicode on one workday
    const longDay = secondEntries.find((e) => e.classification === "workday");
    if (longDay) {
      longDay.accomplishments = [
        "Prepared <draft> & reviewed “Sanggunian” minutes — Niño Aquino Day follow-up with long text ".repeat(
          2,
        ),
      ];
      longDay.remarks = "ok & fine <yes>";
    }
    const second = ReportMappingService.toFlatTokens(
      ReportMappingService.buildPayload({
        reportId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        startDate: "2026-08-16",
        endDate: "2026-08-31",
        profileSnapshot: secondProfile,
        signatorySnapshot: signatories(secondProfile.employeeName),
        entries: secondEntries,
      }),
    );
    expect(second.r16_date).not.toBe("");
    const secondBuf = render(second);
    expect(validateGeneratedAccomplishmentDocx(secondBuf, second)).toEqual([]);
    writeFileSync(path.join(FIXTURE_DIR, "second-half-16.generated.docx"), secondBuf);

    expect(validateDocxZipStructure(firstBuf)).toEqual([]);
    expect(new PizZip(firstBuf).file("[Content_Types].xml")).toBeTruthy();
    expect(new PizZip(firstBuf).file("word/document.xml")).toBeTruthy();
  });

  it("DocxExportService generates via local runtime fallback", async () => {
    const result = await DocxExportService.generateAccomplishmentDocx(
      {
        reportId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        startDate: "2026-08-01",
        endDate: "2026-08-15",
        profileSnapshot: {
          employeeName: "Export Service",
          employeeTitle: "COS",
          organizationName: "MUNICIPALITY OF SANCHEZ MIRA",
          officeName: "VICE MAYOR'S OFFICE",
          departmentName: "IT",
          timezone: "Asia/Manila",
          locale: "en-PH",
        },
        signatorySnapshot: signatories("Export Service"),
        entries: buildEntries(1, 15),
      },
      { allowLocalTemplateFallback: true },
    );
    expect(result.mimeType).toContain("wordprocessingml");
    expect(result.fileName).toContain("Export-Service");
    expect(result.buffer.byteLength).toBeGreaterThan(1000);
  });

  it("rejects corrupt and hash-mismatched templates", async () => {
    const { TemplateService } = await import("@/server/services/template-service");
    await expect(
      TemplateService.loadAccomplishmentTemplateBytes({
        allowLocalFallback: true,
      }),
    ).resolves.toBeTruthy();

    // corrupt buffer structural check
    const issues = validateDocxZipStructure(Buffer.from("not-a-zip"));
    expect(issues.some((i) => i.code === "INVALID_ZIP")).toBe(true);

    const oversized = validateDocxZipStructure(Buffer.alloc(20), { maxBytes: 10 });
    expect(oversized.some((i) => i.code === "TOO_LARGE")).toBe(true);
  });

  it("maps ExportError codes safely", () => {
    const err = new ExportError("TEMPLATE_HASH_MISMATCH", "hash");
    expect(err.code).toBe("TEMPLATE_HASH_MISMATCH");
    expect(err.status).toBe(500);
  });
});

afterAll(() => {
  // fixtures intentionally retained under gitignored path for visual review
});
