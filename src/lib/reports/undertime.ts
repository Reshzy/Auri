import {
  calculateWorkedMinutes,
  sessionDurationMinutes,
  timeToMinutes,
  type SessionPair,
} from "@/lib/reports/time";

export type ScheduledSessions = {
  amStart: string | null;
  amEnd: string | null;
  pmStart: string | null;
  pmEnd: string | null;
};

/**
 * Late arrival + early departure only. Overtime / early arrival never cancel undertime.
 * Missing sessions contribute 0 to calculated undertime (warn separately).
 */
export function calculateUndertimeMinutes(
  actual: { am: SessionPair; pm: SessionPair },
  scheduled: ScheduledSessions,
): number {
  let total = 0;

  if (actual.am.arrival && actual.am.departure && scheduled.amStart && scheduled.amEnd) {
    total += Math.max(
      0,
      timeToMinutes(actual.am.arrival) - timeToMinutes(scheduled.amStart),
    );
    total += Math.max(
      0,
      timeToMinutes(scheduled.amEnd) - timeToMinutes(actual.am.departure),
    );
  }

  if (actual.pm.arrival && actual.pm.departure && scheduled.pmStart && scheduled.pmEnd) {
    total += Math.max(
      0,
      timeToMinutes(actual.pm.arrival) - timeToMinutes(scheduled.pmStart),
    );
    total += Math.max(
      0,
      timeToMinutes(scheduled.pmEnd) - timeToMinutes(actual.pm.departure),
    );
  }

  return total;
}

export function finalUndertimeMinutes(
  calculated: number,
  overrideMinutes: number | null | undefined,
): number {
  if (overrideMinutes === null || overrideMinutes === undefined) {
    return calculated;
  }
  return overrideMinutes;
}

export function hasCompleteSession(am: SessionPair, pm: SessionPair): boolean {
  return sessionDurationMinutes(am) > 0 || sessionDurationMinutes(pm) > 0;
}

export function workedAndUndertime(input: {
  am: SessionPair;
  pm: SessionPair;
  scheduled: ScheduledSessions;
  undertimeOverrideMinutes?: number | null;
}): {
  workedMinutes: number;
  calculatedUndertimeMinutes: number;
  finalUndertimeMinutes: number;
} {
  const workedMinutes = calculateWorkedMinutes(input.am, input.pm);
  const calculatedUndertimeMinutes = calculateUndertimeMinutes(
    { am: input.am, pm: input.pm },
    input.scheduled,
  );
  return {
    workedMinutes,
    calculatedUndertimeMinutes,
    finalUndertimeMinutes: finalUndertimeMinutes(
      calculatedUndertimeMinutes,
      input.undertimeOverrideMinutes,
    ),
  };
}
