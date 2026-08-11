import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import {
  ReportMappingService,
  type MappingReportInput,
} from "../src/server/services/report-mapping-service";
import { validateGeneratedAccomplishmentDocx } from "../src/server/services/docx-structural";
import { ACCOMPLISHMENT_SOURCE_SHA256 } from "../src/lib/templates/accomplishment-tokens";

config({ path: ".env.local" });
config();

function main() {
  const signatories = [0, 1, 2, 3].map((slot) => ({
    slot,
    displayName: slot === 0 ? "Smoke Employee" : `Signatory ${slot}`,
    title: slot === 0 ? "COS" : `Title ${slot}`,
    isActive: true,
    effectiveFrom: null as string | null,
    effectiveTo: null as string | null,
  }));

  const entries: MappingReportInput["entries"] = [];
  for (let day = 1; day <= 15; day += 1) {
    const workDate = `2026-08-${String(day).padStart(2, "0")}`;
    const isOff =
      day === 1 ||
      day === 2 ||
      day === 7 ||
      day === 8 ||
      day === 9 ||
      day === 14 ||
      day === 15;
    if (isOff) {
      entries.push({
        workDate,
        classification: "scheduled_off",
        classificationLabel:
          day === 1 || day === 8 || day === 15
            ? "Saturday"
            : day === 2 || day === 9
              ? "Sunday"
              : "Friday",
        amArrival: null,
        amDeparture: null,
        pmArrival: null,
        pmDeparture: null,
        workedMinutes: 0,
        calculatedUndertimeMinutes: 0,
        undertimeOverrideMinutes: null,
        accomplishments: [],
        remarks: null,
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
        accomplishments: ["Assisted visitors", "Prepared documents"],
        remarks: "",
      });
    }
  }

  const input: MappingReportInput = {
    reportId: "00000000-0000-4000-8000-000000000001",
    startDate: "2026-08-01",
    endDate: "2026-08-15",
    profileSnapshot: {
      employeeName: "Smoke Employee",
      employeeTitle: "COS",
      organizationName: "MUNICIPALITY OF SANCHEZ MIRA",
      officeName: "VICE MAYOR'S OFFICE",
      departmentName: "IT",
      timezone: "Asia/Manila",
      locale: "en-PH",
    },
    signatorySnapshot: signatories,
    entries,
  };

  const payload = ReportMappingService.buildPayload(input);
  const tokens = ReportMappingService.toFlatTokens(payload);
  if (tokens.r16_date !== "") {
    throw new Error("Expected blank unused row 16");
  }

  const runtimePath = path.join(
    process.cwd(),
    "templates",
    "runtime",
    "accomplishment-report-v1.docx",
  );
  if (!existsSync(runtimePath)) {
    throw new Error("Runtime template missing — run pnpm docx:prepare");
  }
  const sourcePath = path.join(
    process.cwd(),
    "templates",
    "source",
    "ACCOMPLISHMENT - RODGE.docx",
  );
  const sourceHash = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
  if (sourceHash !== ACCOMPLISHMENT_SOURCE_SHA256) {
    throw new Error("Source template hash changed");
  }

  const templateBuffer = readFileSync(runtimePath);
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      throw new Error("MISSING_TAG");
    },
  });
  doc.render(tokens);
  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;

  const issues = validateGeneratedAccomplishmentDocx(buffer, tokens);
  if (issues.length > 0) {
    throw new Error(
      `Structural validation failed: ${issues.map((i) => i.code).join(", ")}`,
    );
  }

  const outDir = path.join(process.cwd(), "fixtures", "docx", "generated");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "smoke-15.generated.docx");
  writeFileSync(outPath, buffer);

  console.log("docx:smoke OK");
  console.log(`file=${path.relative(process.cwd(), outPath)}`);
  console.log(`bytes=${buffer.byteLength}`);
  console.log(`sha256=${createHash("sha256").update(buffer).digest("hex")}`);
  console.log(`total=${tokens.total_hours_label}`);
}

try {
  main();
} catch (error) {
  console.error(
    `docx:smoke FAILED: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
