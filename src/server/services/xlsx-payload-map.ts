import type { ExportPayload } from "@/server/services/report-mapping-service";
import {
  formatDtrClock,
  formatDtrEmployeeName,
  dtrUndertimeCellValues,
  isDtrBlankDay,
  dtrRowForCalendarDay,
} from "@/lib/reports/dtr-format";
import {
  DTR_DAY_COLUMNS,
  DTR_MAX_DAYS,
  DTR_OWNED_LEFT,
  cellRef,
  calendarDayToRow,
} from "@/lib/templates/dtr-cell-map";

export type DtrCellValue =
  | { kind: "inline"; value: string }
  | { kind: "number"; value: number }
  | { kind: "clear" };

export type DtrCellMap = Record<string, DtrCellValue>;

/**
 * Build owned cell values for dual-copy DTR writing.
 * Mirror-formula cells (I6, L8, A53, I53) are not written — formulas preserved separately.
 * Day numbers 1–31 are always written on both copies; out-of-period days blank times/undertime.
 */
export function buildDtrCellMap(payload: ExportPayload): DtrCellMap {
  const map: DtrCellMap = {};
  const employee = formatDtrEmployeeName(payload.employee.name);
  const period = payload.period.dtrLabel;

  map[DTR_OWNED_LEFT.employeeName] = { kind: "inline", value: employee };
  map[DTR_OWNED_LEFT.periodLabel] = { kind: "inline", value: period };

  const byDay = new Map(payload.entries.map((e) => [e.dayNumber, e]));

  for (let day = 1; day <= DTR_MAX_DAYS; day += 1) {
    const row = calendarDayToRow(day);
    const leftDay = cellRef(DTR_DAY_COLUMNS.dayNumber.left, row);
    const rightDay = cellRef(DTR_DAY_COLUMNS.dayNumber.right, row);
    map[leftDay] = { kind: "number", value: day };
    map[rightDay] = { kind: "number", value: day };

    const entry = byDay.get(day);
    const blankTimes = !entry || isDtrBlankDay(entry.classification);

    const timeFields = ["amArrival", "amDeparture", "pmArrival", "pmDeparture"] as const;

    for (const field of timeFields) {
      const cols = DTR_DAY_COLUMNS[field];
      const left = cellRef(cols.left, row);
      const right = cellRef(cols.right, row);
      if (blankTimes) {
        map[left] = { kind: "clear" };
        map[right] = { kind: "clear" };
      } else {
        const raw = entry![field];
        const formatted = formatDtrClock(raw);
        if (!formatted) {
          map[left] = { kind: "clear" };
          map[right] = { kind: "clear" };
        } else {
          map[left] = { kind: "inline", value: formatted };
          map[right] = { kind: "inline", value: formatted };
        }
      }
    }

    const hoursCols = DTR_DAY_COLUMNS.undertimeHours;
    const minsCols = DTR_DAY_COLUMNS.undertimeMinutes;
    const leftH = cellRef(hoursCols.left, row);
    const rightH = cellRef(hoursCols.right, row);
    const leftM = cellRef(minsCols.left, row);
    const rightM = cellRef(minsCols.right, row);

    if (blankTimes || !entry) {
      map[leftH] = { kind: "clear" };
      map[rightH] = { kind: "clear" };
      map[leftM] = { kind: "clear" };
      map[rightM] = { kind: "clear" };
    } else {
      const ut = dtrUndertimeCellValues(entry.undertimeMinutes);
      if (ut.hours == null) {
        map[leftH] = { kind: "clear" };
        map[rightH] = { kind: "clear" };
        map[leftM] = { kind: "clear" };
        map[rightM] = { kind: "clear" };
      } else {
        map[leftH] = { kind: "number", value: ut.hours };
        map[rightH] = { kind: "number", value: ut.hours };
        map[leftM] = { kind: "number", value: ut.minutes! };
        map[rightM] = { kind: "number", value: ut.minutes! };
      }
    }
  }

  return map;
}

/** Days that belong to the report period (calendar day numbers). */
export function periodDaySet(payload: ExportPayload): Set<number> {
  return new Set(payload.entries.map((e) => e.dayNumber));
}

export { dtrRowForCalendarDay };
