import { describe, expect, it } from "vitest";
import {
  calendarDayFromYmd,
  dtrRowForCalendarDay,
  dtrUndertimeCellValues,
  finalUndertimeMinutes,
  formatDtrClock,
  formatDtrEmployeeName,
  formatDtrPeriodLabel,
  isDtrBlankDay,
  splitUndertimeMinutes,
} from "@/lib/reports/dtr-format";
import {
  buildDtrFilename,
  sanitizeEmployeeNameForFilename,
} from "@/lib/exports/filename";
import {
  isUnsafeZipEntryName,
  validateZipEntryNames,
} from "@/server/services/xlsx-zip-safety";
import {
  clearCellValue,
  columnIndexToLetters,
  columnLettersToIndex,
  escapeXmlText,
  parseCellRef,
  preserveFormula,
  readCellFormula,
  readCellLogicalValue,
  readCellStyleId,
  setInlineString,
  setNumber,
} from "@/server/services/xlsx-ooxml";
import { ExportError, toSafeExportErrorBody } from "@/lib/exports/errors";
import { buildDtrCellMap } from "@/server/services/xlsx-payload-map";
import type { ExportPayload } from "@/server/services/report-mapping-service";

describe("dtr-format", () => {
  it("formats DTR period as uppercase month without year", () => {
    expect(formatDtrPeriodLabel("2026-08-01", "2026-08-15")).toBe("AUGUST 1-15");
    expect(formatDtrPeriodLabel("2026-08-16", "2026-08-31")).toBe("AUGUST 16-31");
  });

  it("uppercases employee names for DTR presentation", () => {
    expect(formatDtrEmployeeName("Rodge Andru P. Viloria")).toBe(
      "RODGE ANDRU P. VILORIA",
    );
  });

  it("formats 12-hour clock without AM/PM or leading zero", () => {
    expect(formatDtrClock("07:00")).toBe("7:00");
    expect(formatDtrClock("12:00")).toBe("12:00");
    expect(formatDtrClock("13:00")).toBe("1:00");
    expect(formatDtrClock("18:05")).toBe("6:05");
    expect(formatDtrClock("00:00")).toBe("12:00");
    expect(formatDtrClock(null)).toBe("");
  });

  it("maps calendar day to worksheet row", () => {
    expect(dtrRowForCalendarDay(1)).toBe(14);
    expect(dtrRowForCalendarDay(15)).toBe(28);
    expect(dtrRowForCalendarDay(16)).toBe(29);
    expect(dtrRowForCalendarDay(31)).toBe(44);
    expect(calendarDayFromYmd("2026-08-16")).toBe(16);
  });

  it("selects final undertime and splits hours/minutes", () => {
    expect(finalUndertimeMinutes(90, null)).toBe(90);
    expect(finalUndertimeMinutes(90, 45)).toBe(45);
    expect(splitUndertimeMinutes(125)).toEqual({ hours: 2, minutes: 5 });
  });

  it("leaves zero undertime blank", () => {
    expect(dtrUndertimeCellValues(0)).toEqual({ hours: null, minutes: null });
    expect(dtrUndertimeCellValues(60)).toEqual({ hours: 1, minutes: 0 });
  });

  it("treats non-workdays as blank DTR days", () => {
    expect(isDtrBlankDay("scheduled_off")).toBe(true);
    expect(isDtrBlankDay("holiday")).toBe(true);
    expect(isDtrBlankDay("leave")).toBe(true);
    expect(isDtrBlankDay("absent")).toBe(true);
    expect(isDtrBlankDay("workday")).toBe(false);
  });
});

describe("DTR filename", () => {
  it("builds sanitized DTR filename", () => {
    const name = buildDtrFilename({
      employeeName: "Rodge Andru P. Viloria",
      startDate: "2026-08-01",
      endDate: "2026-08-15",
    });
    expect(name).toBe("Auri_Rodge-Andru-P.-Viloria_2026-08-01_to_2026-08-15_DTR.xlsx");
    expect(sanitizeEmployeeNameForFilename('A<B>:C"/D\\|?*E')).not.toMatch(
      /[<>:"/\\|?*]/,
    );
  });
});

describe("zip safety", () => {
  it("rejects unsafe ZIP paths", () => {
    expect(isUnsafeZipEntryName("../evil.xml")).toBe(true);
    expect(isUnsafeZipEntryName("/abs.xml")).toBe(true);
    expect(isUnsafeZipEntryName("a\\b.xml")).toBe(true);
    expect(isUnsafeZipEntryName("xl/worksheets/sheet1.xml")).toBe(false);
    const issues = validateZipEntryNames(["../x", "ok.xml", "ok.xml"]);
    expect(issues.some((i) => i.code === "ZIP_SLIP")).toBe(true);
    expect(issues.some((i) => i.code === "ZIP_DUPLICATE")).toBe(true);
  });
});

describe("xlsx-ooxml helpers", () => {
  const baseSheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="6"><c r="A6" s="65" t="s"><v>19</v></c></row>
    <row r="14">
      <c r="A14" s="24"><v>1</v></c>
      <c r="B14" s="34"/>
      <c r="F14" s="30"/>
      <c r="G14" s="6"/>
    </row>
    <row r="45"><c r="F45" s="47"><f>SUM(F14:F44)</f><v>0</v></c></row>
  </sheetData>
</worksheet>`;

  it("parses cell refs and multi-letter columns", () => {
    expect(parseCellRef("A14")).toEqual({ col: "A", row: 14, colIndex: 1 });
    expect(parseCellRef("AA1").colIndex).toBe(27);
    expect(columnLettersToIndex("O")).toBe(15);
    expect(columnIndexToLetters(15)).toBe("O");
    expect(columnIndexToLetters(27)).toBe("AA");
  });

  it("escapes XML text", () => {
    expect(escapeXmlText(`A&B<C>"D`)).toBe("A&amp;B&lt;C&gt;&quot;D");
  });

  it("writes inline strings and preserves style", () => {
    const next = setInlineString(baseSheet, "A6", "JUAN DELA CRUZ");
    expect(readCellStyleId(next, "A6")).toBe("65");
    expect(readCellLogicalValue(next, "A6")).toBe("JUAN DELA CRUZ");
    expect(next).toContain("inlineStr");
  });

  it("writes numbers, clears cells, and preserves formulas", () => {
    let xml = setNumber(baseSheet, "F14", 1);
    expect(readCellLogicalValue(xml, "F14")).toBe(1);
    expect(readCellStyleId(xml, "F14")).toBe("30");
    xml = clearCellValue(xml, "G14");
    expect(readCellLogicalValue(xml, "G14")).toBeNull();
    xml = preserveFormula(xml, "F45", "SUM(F14:F44)", { clearCachedValue: true });
    expect(readCellFormula(xml, "F45")).toBe("SUM(F14:F44)");
    expect(readCellLogicalValue(xml, "F45")).toBeNull();
  });

  it("inserts missing cells in column order", () => {
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="14"><c r="A14" s="1"/><c r="C14" s="3"/></row></sheetData></worksheet>`;
    const next = setInlineString(sheet, "B14", "7:00");
    const row = next.match(/<row r="14"[\s\S]*?<\/row>/)?.[0] ?? "";
    const refs = [...row.matchAll(/r="([A-Z]+\d+)"/g)].map((m) => m[1]);
    expect(refs).toEqual(["A14", "B14", "C14"]);
  });
});

describe("buildDtrCellMap blanking", () => {
  function payload(
    partial: Partial<ExportPayload> & { entries: ExportPayload["entries"] },
  ): ExportPayload {
    return {
      reportId: "r1",
      employee: { name: "Test User", title: null },
      organization: { municipality: "", office: "", department: "" },
      period: {
        startDate: "2026-08-01",
        endDate: "2026-08-15",
        accomplishmentLabel: "August 1-15, 2026",
        dtrLabel: "AUGUST 1-15",
      },
      totalWorkedMinutes: 0,
      signatories: [],
      certificationText: "",
      reportTitle: "",
      ...partial,
    };
  }

  it("blanks days outside first half", () => {
    const map = buildDtrCellMap(
      payload({
        entries: [
          {
            date: "2026-08-03",
            dayNumber: 3,
            classification: "workday",
            classificationLabel: null,
            amArrival: "07:00",
            amDeparture: "12:00",
            pmArrival: "13:00",
            pmDeparture: "18:00",
            workedMinutes: 600,
            undertimeMinutes: 0,
            accomplishments: [],
            remarks: null,
          },
        ],
      }),
    );
    expect(map.B14).toEqual({ kind: "clear" });
    expect(map.B16).toEqual({ kind: "inline", value: "7:00" });
    expect(map.B29).toEqual({ kind: "clear" }); // day 16
    expect(map.A16).toEqual({ kind: "number", value: 3 });
    expect(map.J16).toEqual({ kind: "inline", value: "7:00" });
  });

  it("blanks non-workdays and applies undertime override split", () => {
    const map = buildDtrCellMap(
      payload({
        entries: [
          {
            date: "2026-08-07",
            dayNumber: 7,
            classification: "scheduled_off",
            classificationLabel: "Friday",
            amArrival: null,
            amDeparture: null,
            pmArrival: null,
            pmDeparture: null,
            workedMinutes: 0,
            undertimeMinutes: 0,
            accomplishments: [],
            remarks: null,
          },
          {
            date: "2026-08-04",
            dayNumber: 4,
            classification: "workday",
            classificationLabel: null,
            amArrival: "07:15",
            amDeparture: "12:00",
            pmArrival: "13:00",
            pmDeparture: "18:00",
            workedMinutes: 585,
            undertimeMinutes: 75,
            accomplishments: [],
            remarks: null,
          },
        ],
      }),
    );
    expect(map.B20).toEqual({ kind: "clear" });
    expect(map.F17).toEqual({ kind: "number", value: 1 });
    expect(map.G17).toEqual({ kind: "number", value: 15 });
    expect(map.N17).toEqual({ kind: "number", value: 1 });
    expect(map.O17).toEqual({ kind: "number", value: 15 });
  });
});

describe("safe export errors", () => {
  it("maps XLSX fallback safely", () => {
    const body = toSafeExportErrorBody(new Error("boom"), {
      fallbackCode: "XLSX_GENERATION_FAILED",
    });
    expect(body.error.code).toBe("XLSX_GENERATION_FAILED");
    expect(body.error.message).not.toContain("boom");
    expect(new ExportError("TEMPLATE_HASH_MISMATCH", "hash").status).toBe(500);
  });
});
