import {
  DTR_MIRROR_FORMULAS,
  DTR_OWNED_LEFT,
  DTR_TOTAL_FORMULAS,
  DTR_DAY_COLUMNS,
  DTR_MAX_DAYS,
  cellRef,
  calendarDayToRow,
} from "@/lib/templates/dtr-cell-map";
import {
  applyCellOperations,
  parseWorksheetDocument,
  readCellLogicalValueFromDoc,
  type BatchCellOp,
} from "@/server/services/xlsx-ooxml";
import type { DtrCellMap } from "@/server/services/xlsx-payload-map";
import { formatDtrEmployeeName } from "@/lib/reports/dtr-format";

export type DualCopyIssue = { code: string; message: string };

export function applyDtrCellMap(sheetXml: string, cellMap: DtrCellMap): string {
  const ops: BatchCellOp[] = [];

  for (const [ref, value] of Object.entries(cellMap)) {
    if (value.kind === "inline") {
      ops.push({ ref, kind: "inline", value: value.value });
    } else if (value.kind === "number") {
      ops.push({ ref, kind: "number", value: value.value });
    } else {
      ops.push({ ref, kind: "clear" });
    }
  }

  for (const mirror of Object.values(DTR_MIRROR_FORMULAS)) {
    ops.push({
      ref: mirror.cell,
      kind: "preserveFormula",
      formula: mirror.formula,
      clearCachedValue: true,
    });
  }

  ops.push({
    ref: DTR_TOTAL_FORMULAS.leftHours.cell,
    kind: "preserveFormula",
    formula: DTR_TOTAL_FORMULAS.leftHours.formula,
  });
  ops.push({
    ref: DTR_TOTAL_FORMULAS.rightHours.cell,
    kind: "preserveFormula",
    formula: DTR_TOTAL_FORMULAS.rightHours.formula,
  });

  return applyCellOperations(sheetXml, ops);
}

function logicalEqual(
  left: string | number | null,
  right: string | number | null,
): boolean {
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  return String(left) === String(right);
}

/**
 * Validate logical left/right equality.
 * For mirror-formula cells, compare left owned value against expected logical right
 * (formula target), not raw XML equality.
 */
export function validateDualCopyLogicalEquality(
  sheetXml: string,
  expected: {
    employeeName: string;
    periodLabel: string;
  },
): DualCopyIssue[] {
  const issues: DualCopyIssue[] = [];
  const employee = formatDtrEmployeeName(expected.employeeName);
  const doc = parseWorksheetDocument(sheetXml);

  const leftName = readCellLogicalValueFromDoc(doc, DTR_OWNED_LEFT.employeeName);
  if (String(leftName ?? "") !== employee) {
    issues.push({
      code: "EMPLOYEE_MISMATCH",
      message: "Left employee name does not match payload.",
    });
  }

  const leftPeriod = readCellLogicalValueFromDoc(doc, DTR_OWNED_LEFT.periodLabel);
  if (String(leftPeriod ?? "") !== expected.periodLabel) {
    issues.push({
      code: "PERIOD_MISMATCH",
      message: "Left period label does not match payload.",
    });
  }

  for (let day = 1; day <= DTR_MAX_DAYS; day += 1) {
    const row = calendarDayToRow(day);
    for (const key of Object.keys(DTR_DAY_COLUMNS) as Array<
      keyof typeof DTR_DAY_COLUMNS
    >) {
      const cols = DTR_DAY_COLUMNS[key];
      const leftRef = cellRef(cols.left, row);
      const rightRef = cellRef(cols.right, row);
      const left = readCellLogicalValueFromDoc(doc, leftRef);
      const right = readCellLogicalValueFromDoc(doc, rightRef);
      if (!logicalEqual(left, right)) {
        issues.push({
          code: "LEFT_RIGHT_MISMATCH",
          message: `Left/right mismatch at day ${day} (${leftRef}/${rightRef}).`,
        });
      }
    }
  }

  return issues;
}
