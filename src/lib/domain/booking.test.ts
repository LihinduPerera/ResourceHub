import { describe, expect, it } from "vitest";
import { BOOKING_RULE_MESSAGES, BOOKING_RULES } from "@/lib/constants";
import {
  findOverlappingRanges,
  rangesOverlap,
  suggestNextStartTimes,
  validateBookingWindow,
  type OccupiedRange,
} from "@/lib/domain/booking";

const MINUTE = 60_000;

/** Builds a Date that is a fixed number of minutes from a reference instant. */
function at(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * MINUTE);
}

describe("rangesOverlap", () => {
  const base = new Date("2030-01-01T10:00:00.000Z");
  const window = { startTime: at(base, 0), endTime: at(base, 60) };

  it("detects a full overlap", () => {
    expect(
      rangesOverlap(window, {
        startTime: at(base, 15),
        endTime: at(base, 45),
      }),
    ).toBe(true);
  });

  it("detects a partial overlap on either edge", () => {
    expect(
      rangesOverlap(window, {
        startTime: at(base, -30),
        endTime: at(base, 30),
      }),
    ).toBe(true);
    expect(
      rangesOverlap(window, {
        startTime: at(base, 30),
        endTime: at(base, 90),
      }),
    ).toBe(true);
  });

  it("treats touching intervals as non-overlapping (half-open)", () => {
    expect(
      rangesOverlap(window, {
        startTime: at(base, 60),
        endTime: at(base, 120),
      }),
    ).toBe(false);
    expect(
      rangesOverlap(window, {
        startTime: at(base, -60),
        endTime: at(base, 0),
      }),
    ).toBe(false);
  });

  it("returns false for a fully separate window", () => {
    expect(
      rangesOverlap(window, {
        startTime: at(base, 120),
        endTime: at(base, 180),
      }),
    ).toBe(false);
  });
});

describe("findOverlappingRanges", () => {
  const base = new Date("2030-01-01T10:00:00.000Z");
  const occupied: OccupiedRange[] = [
    { id: "a", startTime: at(base, 0), endTime: at(base, 60) },
    { id: "b", startTime: at(base, 120), endTime: at(base, 180) },
    { id: "c", startTime: at(base, 240), endTime: at(base, 300) },
  ];

  it("returns only the intersecting ranges", () => {
    const matches = findOverlappingRanges(occupied, {
      startTime: at(base, 30),
      endTime: at(base, 150),
    });

    expect(matches.map((range) => range.id)).toEqual(["a", "b"]);
  });

  it("returns nothing when the slot is free", () => {
    const matches = findOverlappingRanges(occupied, {
      startTime: at(base, 60),
      endTime: at(base, 120),
    });

    expect(matches).toHaveLength(0);
  });
});

describe("validateBookingWindow", () => {
  const now = new Date("2030-06-01T09:00:00.000Z");

  it("accepts a valid future booking", () => {
    const result = validateBookingWindow(
      { startTime: at(now, 60), endTime: at(now, 120) },
      now,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an end time that is not after the start", () => {
    const result = validateBookingWindow(
      { startTime: at(now, 120), endTime: at(now, 60) },
      now,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(BOOKING_RULE_MESSAGES.endAfterStart);
  });

  it("rejects a booking that starts in the past", () => {
    const result = validateBookingWindow(
      { startTime: at(now, -120), endTime: at(now, -60) },
      now,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(BOOKING_RULE_MESSAGES.startInPast);
  });

  it("allows a start time within the future grace window", () => {
    const result = validateBookingWindow(
      {
        startTime: new Date(
          now.getTime() - (BOOKING_RULES.futureGraceSeconds / 2) * 1000,
        ),
        endTime: at(now, 60),
      },
      now,
    );

    expect(result.valid).toBe(true);
  });

  it("rejects a booking shorter than the minimum duration", () => {
    const result = validateBookingWindow(
      {
        startTime: at(now, 60),
        endTime: at(now, 60 + BOOKING_RULES.minDurationMinutes - 5),
      },
      now,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(BOOKING_RULE_MESSAGES.tooShort);
  });

  it("rejects a booking longer than the maximum duration", () => {
    const result = validateBookingWindow(
      {
        startTime: at(now, 60),
        endTime: at(now, 60 + BOOKING_RULES.maxDurationMinutes + 5),
      },
      now,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(BOOKING_RULE_MESSAGES.tooLong);
  });

  it("rejects a booking too far in the future", () => {
    const startTime = new Date(
      now.getTime() + (BOOKING_RULES.maxDaysInAdvance + 1) * 86_400_000,
    );
    const result = validateBookingWindow(
      { startTime, endTime: new Date(startTime.getTime() + 60 * MINUTE) },
      now,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(BOOKING_RULE_MESSAGES.tooFarAhead);
  });

  it("rejects invalid dates", () => {
    const result = validateBookingWindow(
      { startTime: new Date("nope"), endTime: new Date("nope") },
      now,
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/valid start and end time/i);
  });
});

describe("suggestNextStartTimes", () => {
  const base = new Date("2030-03-01T09:00:00.000Z");
  const duration = 60 * MINUTE;

  it("suggests the current start when nothing blocks it", () => {
    const suggestions = suggestNextStartTimes([], base, duration, 3);

    expect(suggestions[0]?.getTime()).toBe(base.getTime());
  });

  it("skips past occupied windows", () => {
    const occupied: OccupiedRange[] = [
      { startTime: at(base, 0), endTime: at(base, 60) },
      { startTime: at(base, 60), endTime: at(base, 120) },
    ];

    const suggestions = suggestNextStartTimes(occupied, base, duration, 3);

    // First free slot begins when the second booking ends (2 hours in).
    expect(suggestions[0]?.getTime()).toBe(at(base, 120).getTime());
  });

  it("returns at most the requested number of suggestions", () => {
    const occupied: OccupiedRange[] = [
      { startTime: at(base, 0), endTime: at(base, 60) },
      { startTime: at(base, 120), endTime: at(base, 180) },
    ];

    const suggestions = suggestNextStartTimes(occupied, base, duration, 1);

    expect(suggestions).toHaveLength(1);
  });

  it("ignores bookings that have already ended before the search start", () => {
    const occupied: OccupiedRange[] = [
      { startTime: at(base, -180), endTime: at(base, -60) },
    ];

    const suggestions = suggestNextStartTimes(occupied, base, duration, 3);

    expect(suggestions[0]?.getTime()).toBe(base.getTime());
  });
});
