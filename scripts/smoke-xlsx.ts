/**
 * Smoke: generate a first-half DTR XLSX from the local runtime template.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { config } from "dotenv";
import { DTR_SOURCE_SHA256, DTR_RUNTIME_FILE } from "../src/lib/templates/dtr-cell-map";
import type { MappingReportInput } from "../src/server/services/report-mapping-service";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);

async function main() {
  const Module = require("module") as {
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };
  const originalLoad = Module._load.bind(Module);
  Module._load = (request: string, parent: unknown, isMain: boolean) => {
    if (request === "server-only") return {};
    return originalLoad(request, parent, isMain);
  };

  const { XlsxExportService } =
    await import("../src/server/services/xlsx-export-service");

  const sourcePath = path.join(process.cwd(), "templates", "source", "DTR RODGE.xlsx");
  const sourceHash = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
  if (sourceHash !== DTR_SOURCE_SHA256) {
    throw new Error("Source template hash changed");
  }

  const runtimePath = path.join(process.cwd(), "templates", "runtime", DTR_RUNTIME_FILE);
  if (!existsSync(runtimePath)) {
    throw new Error("Runtime template missing — run pnpm xlsx:prepare");
  }

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
    const isOff = [1, 2, 7, 8, 9, 14, 15].includes(day);
    if (isOff) {
      entries.push({
        workDate,
        classification: "scheduled_off",
        classificationLabel: "Friday",
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
        accomplishments: ["Assisted visitors"],
        remarks: "",
      });
    }
  }

  const input: MappingReportInput = {
    reportId: "00000000-0000-4000-8000-000000000007",
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

  const result = await XlsxExportService.generateDtrXlsx(input, {
    allowLocalTemplateFallback: true,
  });

  const outDir = path.join(process.cwd(), "fixtures", "xlsx", "generated");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "smoke-first-half.generated.xlsx");
  writeFileSync(outPath, result.buffer);

  console.log("xlsx:smoke OK");
  console.log(`fileName=${result.fileName}`);
  console.log(`sha256=${result.sha256}`);
  console.log(`bytes=${result.fileSizeBytes}`);
  console.log(`wrote=${outPath}`);
  process.exit(0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`xlsx:smoke FAILED: ${message}`);
  process.exit(1);
});
