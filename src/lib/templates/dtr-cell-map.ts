/** Shared DTR XLSX cell-map contract (Phase 7). */

export const DTR_TEMPLATE_ID = "dtr-csc-form-48-v1";
export const DTR_TEMPLATE_KEY = "dtr";
export const DTR_SOURCE_FILE = "DTR RODGE.xlsx";
export const DTR_RUNTIME_FILE = "dtr-csc-form-48-v1.xlsx";
export const DTR_SOURCE_SHA256 =
  "26a88e371c9df57ab3a2535493d81af70cf5f788cead3695dcc67de0b12da80c";
export const DTR_MAX_DAYS = 31;
export const DTR_DAY_ROW_OFFSET = 13; // worksheet row = calendar day + 13
export const DTR_PREPARE_TOOL_VERSION = "1";

export const DTR_SHEET_NAME = "Sheet1";
export const DTR_WORKSHEET_PATH = "xl/worksheets/sheet1.xml";

export const DTR_PAGE_SETUP = {
  paperSize: "14",
  orientation: "landscape",
  scale: "73",
  margin: "0.25",
  horizontalCentered: "1",
} as const;

/** Owned left-side identity/period inputs (right side mirrors via formula). */
export const DTR_OWNED_LEFT = {
  employeeName: "A6",
  periodLabel: "D8",
} as const;

/** Mirror-formula cells — preserve formula; clear stale cached values. */
export const DTR_MIRROR_FORMULAS = {
  employeeNameRight: { cell: "I6", formula: "A6" },
  periodLabelRight: { cell: "L8", formula: "D8" },
  signatureLeft: { cell: "A53", formula: "A6" },
  signatureRight: { cell: "I53", formula: "A6" },
} as const;

/** Total undertime formulas that must remain exact. */
export const DTR_TOTAL_FORMULAS = {
  leftHours: { cell: "F45", formula: "SUM(F14:F44)" },
  rightHours: { cell: "N45", formula: "SUM(N14:N44)" },
} as const;

export type DtrDayColumn =
  | "dayNumber"
  | "amArrival"
  | "amDeparture"
  | "pmArrival"
  | "pmDeparture"
  | "undertimeHours"
  | "undertimeMinutes";

/** Independent day columns — write both left and right copies. */
export const DTR_DAY_COLUMNS: Record<DtrDayColumn, { left: string; right: string }> = {
  dayNumber: { left: "A", right: "I" },
  amArrival: { left: "B", right: "J" },
  amDeparture: { left: "C", right: "K" },
  pmArrival: { left: "D", right: "L" },
  pmDeparture: { left: "E", right: "M" },
  undertimeHours: { left: "F", right: "N" },
  undertimeMinutes: { left: "G", right: "O" },
};

/** Exact merge ranges from TEMPLATE_AUDIT.md §3.5 (stable contract). */
export const DTR_MERGE_RANGES = [
  "A1:C1",
  "I1:K1",
  "B3:F3",
  "J3:N3",
  "A6:G6",
  "I6:O6",
  "A7:G7",
  "I7:O7",
  "D8:G8",
  "L8:O8",
  "A12:A13",
  "I12:I13",
  "B12:C12",
  "D12:E12",
  "F12:G12",
  "J12:K12",
  "L12:M12",
  "N12:O12",
  "A45:E45",
  "I45:M45",
  "A53:G53",
  "I53:O53",
  "B59:F59",
  "J59:N59",
  "F60:G60",
  "N60:O60",
] as const;

export const DTR_REQUIRED_PACKAGE_PARTS = [
  "[Content_Types].xml",
  "xl/workbook.xml",
  "xl/_rels/workbook.xml.rels",
  "xl/worksheets/sheet1.xml",
  "xl/worksheets/sheet2.xml",
  "xl/worksheets/sheet3.xml",
  "xl/worksheets/_rels/sheet1.xml.rels",
  "xl/drawings/drawing1.xml",
  "xl/drawings/vmlDrawing1.vml",
] as const;

export const DTR_SAMPLE_EMPLOYEE = "RODGE ANDRU P. VILORIA";
export const DTR_SAMPLE_PERIOD = "AUGUST 1-15";

export function calendarDayToRow(day: number): number {
  return day + DTR_DAY_ROW_OFFSET;
}

export function cellRef(column: string, row: number): string {
  return `${column}${row}`;
}
