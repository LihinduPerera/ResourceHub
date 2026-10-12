import { BOOKING_RULE_MESSAGES, BOOKING_RULES } from "@/lib/constants";

/**
 * Pure booking-domain logic, separated from the database so the rules are easy
 * to unit-test and reason about.
 */

export type TimeWindow = {
  startTime: Date;
  endTime: Date;
};

export type OccupiedRange = TimeWindow & { id?: string };

export type BookingWindowResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Validates a requested booking window against the organisation's rules:
 * well-formed, in the future, within the min/max duration, and not too far
 * ahead.
 */
export function validateBookingWindow(
  window: TimeWindow,
  now: Date = new Date(),
): BookingWindowResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (
    Number.isNaN(window.startTime.getTime()) ||
    Number.isNaN(window.endTime.getTime())
  ) {
    return {
      valid: false,
      errors: ["A valid start and end time are required."],
      warnings,
    };
  }

  const startMs = window.startTime.getTime();
  const endMs = window.endTime.getTime();
  const nowMs = now.getTime();
  const durationMinutes = (endMs - startMs) / 60_000;

  if (endMs <= startMs) {
    errors.push(BOOKING_RULE_MESSAGES.endAfterStart);
  }

  if (startMs < nowMs - BOOKING_RULES.futureGraceSeconds * 1000) {
    errors.push(BOOKING_RULE_MESSAGES.startInPast);
  }

  if (durationMinutes < BOOKING_RULES.minDurationMinutes) {
    errors.push(BOOKING_RULE_MESSAGES.tooShort);
  }

  if (durationMinutes > BOOKING_RULES.maxDurationMinutes) {
    errors.push(BOOKING_RULE_MESSAGES.tooLong);
  }

  if (endMs > nowMs + BOOKING_RULES.maxDaysInAdvance * 86_400_000) {
    errors.push(BOOKING_RULE_MESSAGES.tooFarAhead);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Half-open interval overlap: `[aStart, aEnd)` vs `[bStart, bEnd)`. */
export function rangesOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.startTime < b.endTime && a.endTime > b.startTime;
}

export function findOverlappingRanges(
  occupied: OccupiedRange[],
  window: TimeWindow,
): OccupiedRange[] {
  return occupied.filter((range) => rangesOverlap(range, window));
}

/**
 * Scans a set of occupied windows and returns up to `count` start times at
 * which a booking of `durationMs` would fit, searching forward from `from`.
 * Used to suggest alternative slots when a request conflicts.
 */
export function suggestNextStartTimes(
  occupied: OccupiedRange[],
  from: Date,
  durationMs: number,
  count = 3,
): Date[] {
  const sorted = occupied
    .filter((range) => range.endTime > from)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const suggestions: Date[] = [];
  let cursor = from;

  for (const booking of sorted) {
    if (booking.startTime < cursor) {
      if (booking.endTime > cursor) {
        cursor = new Date(booking.endTime.getTime());
      }
      continue;
    }

    const gapMs = booking.startTime.getTime() - cursor.getTime();
    if (gapMs >= durationMs) {
      suggestions.push(new Date(cursor.getTime()));
      if (suggestions.length >= count) return suggestions;
    }

    if (booking.endTime > cursor) {
      cursor = new Date(booking.endTime.getTime());
    }
  }

  if (suggestions.length < count) {
    suggestions.push(new Date(cursor.getTime()));
  }

  return suggestions.slice(0, count);
}
