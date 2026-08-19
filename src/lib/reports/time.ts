/** Time normalization and session duration helpers (integer minutes). */

const CANONICAL_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type NormalizeTimeResult =
  { ok: true; value: string } | { ok: false; error: string };

/**
 * Accept keyboard-friendly inputs (`700`, `7:00`, `07:00`) and Postgres `HH:MM:SS`.
 * Normalize to canonical 24-hour `HH:MM`.
 * PM session fields treat 1:00–11:59 as afternoon (column context, no AM/PM suffix).
 */
export function normalizeTimeInput(
  raw: string | null | undefined,
  session?: "am" | "pm",
): NormalizeTimeResult {
  if (raw === null || raw === undefined) {
    return { ok: true, value: "" };
  }
  const trimmed = String(raw).trim();
  if (trimmed.length === 0) {
    return { ok: true, value: "" };
  }

  let hours: number;
  let minutes: number;

  if (CANONICAL_RE.test(trimmed)) {
    hours = Number(trimmed.slice(0, 2));
    minutes = Number(trimmed.slice(3, 5));
  } else if (/^\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    // PostgreSQL time values often include seconds.
    hours = Number(trimmed.slice(0, 2));
    minutes = Number(trimmed.slice(3, 5));
  } else if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(":");
    hours = Number(h);
    minutes = Number(m);
  } else if (/^\d{3,4}$/.test(trimmed)) {
    const padded = trimmed.padStart(4, "0");
    hours = Number(padded.slice(0, 2));
    minutes = Number(padded.slice(2, 4));
  } else if (/^\d{1,2}$/.test(trimmed)) {
    hours = Number(trimmed);
    minutes = 0;
  } else {
    return { ok: false, error: "Invalid time format. Use 700, 7:00, or 07:00." };
  }

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return { ok: false, error: "Invalid time format." };
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { ok: false, error: "Time must be a valid 24-hour clock value." };
  }

  // PM columns are 12-hour without AM/PM (DTR context). 1:00–11:59 → 13:00–23:59.
  // 12:xx stays noon; 13:00–23:59 is already 24-hour and is left unchanged.
  if (session === "pm" && hours >= 1 && hours <= 11) {
    hours += 12;
  }

  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return {
    ok: true,
    value,
  };
}

export function timeToMinutes(hhmm: string): number {
  if (!CANONICAL_RE.test(hhmm)) {
    throw new Error(`Expected canonical HH:MM, got ${hhmm}`);
  }
  const hours = Number(hhmm.slice(0, 2));
  const minutes = Number(hhmm.slice(3, 5));
  return hours * 60 + minutes;
}

export function minutesBetween(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}

export type SessionPair = {
  arrival: string | null;
  departure: string | null;
};

export type SessionValidationIssue = {
  field: "am" | "pm" | "cross";
  message: string;
};

export function validateSessionPair(
  pair: SessionPair,
  field: "am" | "pm",
): SessionValidationIssue | null {
  const hasArrival = Boolean(pair.arrival);
  const hasDeparture = Boolean(pair.departure);
  if (hasArrival !== hasDeparture) {
    return {
      field,
      message: `${field.toUpperCase()} arrival and departure must be provided as a pair.`,
    };
  }
  if (!pair.arrival || !pair.departure) {
    return null;
  }
  if (timeToMinutes(pair.arrival) >= timeToMinutes(pair.departure)) {
    return {
      field,
      message: `${field.toUpperCase()} arrival must be earlier than departure.`,
    };
  }
  return null;
}

export function validateAmPmOrdering(
  am: SessionPair,
  pm: SessionPair,
): SessionValidationIssue | null {
  if (!am.departure || !pm.arrival) {
    return null;
  }
  if (timeToMinutes(am.departure) > timeToMinutes(pm.arrival)) {
    return {
      field: "cross",
      message: "AM departure cannot be later than PM arrival.",
    };
  }
  return null;
}

export function sessionDurationMinutes(pair: SessionPair): number {
  if (!pair.arrival || !pair.departure) {
    return 0;
  }
  const duration = minutesBetween(pair.arrival, pair.departure);
  return duration > 0 ? duration : 0;
}

export function calculateWorkedMinutes(am: SessionPair, pm: SessionPair): number {
  return sessionDurationMinutes(am) + sessionDurationMinutes(pm);
}

export type NormalizedDayTimes = {
  amArrival: string | null;
  amDeparture: string | null;
  pmArrival: string | null;
  pmDeparture: string | null;
  issues: SessionValidationIssue[];
};

export function normalizeAndValidateDayTimes(input: {
  amArrival?: string | null;
  amDeparture?: string | null;
  pmArrival?: string | null;
  pmDeparture?: string | null;
}): NormalizedDayTimes {
  const fields = ["amArrival", "amDeparture", "pmArrival", "pmDeparture"] as const;
  const normalized: Record<(typeof fields)[number], string | null> = {
    amArrival: null,
    amDeparture: null,
    pmArrival: null,
    pmDeparture: null,
  };
  const issues: SessionValidationIssue[] = [];

  for (const key of fields) {
    const result = normalizeTimeInput(input[key], key.startsWith("pm") ? "pm" : "am");
    if (!result.ok) {
      issues.push({
        field: key.startsWith("am") ? "am" : "pm",
        message: result.error,
      });
      continue;
    }
    normalized[key] = result.value.length > 0 ? result.value : null;
  }

  if (issues.length > 0) {
    return { ...normalized, issues };
  }

  const am = { arrival: normalized.amArrival, departure: normalized.amDeparture };
  const pm = { arrival: normalized.pmArrival, departure: normalized.pmDeparture };

  const amIssue = validateSessionPair(am, "am");
  if (amIssue) issues.push(amIssue);
  const pmIssue = validateSessionPair(pm, "pm");
  if (pmIssue) issues.push(pmIssue);
  const cross = validateAmPmOrdering(am, pm);
  if (cross) issues.push(cross);

  return { ...normalized, issues };
}
