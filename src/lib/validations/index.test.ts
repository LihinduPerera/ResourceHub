import { describe, expect, it } from "vitest";
import {
  createReservationSchema,
  createResourceSchema,
  listReservationsQuerySchema,
  reservationDecisionSchema,
  signUpSchema,
  updateResourceSchema,
  updateUserRoleSchema,
} from "@/lib/validations";

describe("createResourceSchema", () => {
  const valid = {
    name: "Boardroom A",
    type: "MEETING_ROOM",
    location: "3rd Floor",
    capacity: 12,
  };

  it("accepts a valid resource and trims text fields", () => {
    const parsed = createResourceSchema.parse({
      ...valid,
      name: "  Boardroom A  ",
      description: "  Big room  ",
    });

    expect(parsed.name).toBe("Boardroom A");
    expect(parsed.description).toBe("Big room");
  });

  it("rejects an unknown resource type", () => {
    const result = createResourceSchema.safeParse({
      ...valid,
      type: "SPACESHIP",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-positive capacity", () => {
    const result = createResourceSchema.safeParse({ ...valid, capacity: 0 });

    expect(result.success).toBe(false);
  });
});

describe("updateResourceSchema", () => {
  it("accepts a partial update", () => {
    const parsed = updateResourceSchema.parse({ name: "Renamed" });

    expect(parsed.name).toBe("Renamed");
  });

  it("accepts an isActive toggle", () => {
    const parsed = updateResourceSchema.parse({ isActive: false });

    expect(parsed.isActive).toBe(false);
  });

  it("rejects an empty update payload", () => {
    const result = updateResourceSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

const iso = (offsetMinutes: number) =>
  new Date(Date.now() + offsetMinutes * 60_000).toISOString();

describe("createReservationSchema", () => {
  const valid = {
    resourceId: "seed-resource-boardroom-a",
    title: "Weekly sync",
    startTime: iso(60),
    endTime: iso(120),
  };

  it("accepts a valid reservation", () => {
    expect(createReservationSchema.safeParse(valid).success).toBe(true);
  });

  it("requires an ISO datetime with an offset", () => {
    const result = createReservationSchema.safeParse({
      ...valid,
      startTime: "2030-01-01 10:00",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a title that is too short", () => {
    const result = createReservationSchema.safeParse({ ...valid, title: "hi" });

    expect(result.success).toBe(false);
  });
});

describe("reservationDecisionSchema", () => {
  it("accepts a confirmation without a reason", () => {
    expect(
      reservationDecisionSchema.safeParse({ action: "CONFIRM" }).success,
    ).toBe(true);
  });

  it("requires a reason when rejecting", () => {
    expect(
      reservationDecisionSchema.safeParse({ action: "REJECT" }).success,
    ).toBe(false);

    expect(
      reservationDecisionSchema.safeParse({
        action: "REJECT",
        rejectionReason: "Room is under maintenance.",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown action", () => {
    expect(
      reservationDecisionSchema.safeParse({ action: "MAYBE" }).success,
    ).toBe(false);
  });
});

describe("listReservationsQuerySchema", () => {
  it("applies pagination defaults and coerces numbers", () => {
    const parsed = listReservationsQuerySchema.parse({ page: "2" });

    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(12);
  });

  it("rejects an invalid status", () => {
    expect(
      listReservationsQuerySchema.safeParse({ status: "DONE" }).success,
    ).toBe(false);
  });
});

describe("updateUserRoleSchema", () => {
  it("accepts known roles", () => {
    expect(updateUserRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(
      true,
    );
  });

  it("rejects unknown roles", () => {
    expect(updateUserRoleSchema.safeParse({ role: "OWNER" }).success).toBe(
      false,
    );
  });
});

describe("signUpSchema", () => {
  it("normalises the email to lower case", () => {
    const parsed = signUpSchema.parse({
      name: "Kasun Silva",
      email: "  KASUN@Example.COM ",
      password: "supersecret",
    });

    expect(parsed.email).toBe("kasun@example.com");
  });

  it("enforces a minimum password length", () => {
    const result = signUpSchema.safeParse({
      name: "Kasun Silva",
      email: "kasun@example.com",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});
