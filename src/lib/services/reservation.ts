import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ACTIVE_RESERVATION_STATUSES, LIST_LIMITS } from "@/lib/constants";
import {
  conflict,
  forbidden,
  notFound,
  validationError,
} from "@/lib/api/errors";
import {
  suggestNextStartTimes,
  validateBookingWindow,
  type OccupiedRange,
} from "@/lib/domain/booking";
import type { CurrentUser } from "@/lib/auth";
import type {
  CreateReservationInput,
  ListReservationsQuery,
  ReservationDecisionInput,
  UpdateReservationInput,
} from "@/lib/validations";
import { resourceExists, normalizeOptionalText } from "./resource";
import type { AvailabilityDTO, PagedResult, ReservedWindow } from "@/lib/types";

export const reservationSelect = {
  id: true,
  title: true,
  notes: true,
  status: true,
  rejectionReason: true,
  startTime: true,
  endTime: true,
  userId: true,
  decidedAt: true,
  decidedById: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, name: true, email: true, image: true },
  },
  resource: {
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      capacity: true,
    },
  },
} satisfies Prisma.ReservationSelect;

export type ReservationRecord = Prisma.ReservationGetPayload<{
  select: typeof reservationSelect;
}>;

const toWindow = (r: { startTime: Date; endTime: Date }): ReservedWindow => ({
  startTime: r.startTime.toISOString(),
  endTime: r.endTime.toISOString(),
});

const toOccupied = (r: {
  startTime: Date;
  endTime: Date;
  id: string;
}): OccupiedRange => ({
  id: r.id,
  startTime: new Date(r.startTime),
  endTime: new Date(r.endTime),
});

type ListParams = ListReservationsQuery & { mine?: boolean };

/**
 * Lists reservations. Members only ever see their own bookings; admins see
 * everything unless the `mine` flag is set.
 */
export async function listReservations(
  params: ListParams,
  actor: CurrentUser,
): Promise<PagedResult<ReservationRecord>> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    LIST_LIMITS.maxPageSize,
    Math.max(1, Math.floor(params.pageSize ?? LIST_LIMITS.defaultPageSize)),
  );

  const where: Prisma.ReservationWhereInput = {};

  if (actor.role !== "ADMIN" || params.mine) {
    where.userId = actor.id;
  }

  if (params.status) where.status = params.status;
  if (params.resourceId) where.resourceId = params.resourceId;

  if (params.search?.trim()) {
    where.title = { contains: params.search.trim(), mode: "insensitive" };
  }

  if (params.from || params.to) {
    where.startTime = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lt: new Date(params.to) } : {}),
    };
  }

  const [total, rows] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      orderBy: [{ startTime: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: reservationSelect,
    }),
  ]);

  return {
    data: rows,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

export async function getReservation(
  id: string,
): Promise<ReservationRecord | null> {
  return prisma.reservation.findUnique({
    where: { id },
    select: reservationSelect,
  });
}

export async function createReservation(
  actor: CurrentUser,
  input: CreateReservationInput,
): Promise<ReservationRecord> {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);

  const window = validateBookingWindow({ startTime, endTime });
  if (!window.valid) {
    throw validationError(
      window.errors.map((message) => ({ field: "", message })),
    );
  }

  if (!(await resourceExists(input.resourceId))) {
    throw conflict("This resource is not available for reservations.");
  }

  await assertNoOverlap(input.resourceId, startTime, endTime, null);

  return prisma.reservation.create({
    data: {
      userId: actor.id,
      resourceId: input.resourceId,
      title: input.title,
      notes: normalizeOptionalText(input.notes),
      startTime,
      endTime,
    },
    select: reservationSelect,
  });
}

export async function updateReservation(
  actor: CurrentUser,
  id: string,
  input: UpdateReservationInput,
): Promise<ReservationRecord> {
  const existing = await prisma.reservation.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      resourceId: true,
      startTime: true,
      endTime: true,
    },
  });

  if (!existing) throw notFound("Reservation not found.");
  assertCanModify(actor, existing.userId);
  if (existing.status === "CANCELLED" || existing.status === "REJECTED") {
    throw conflict("Cancelled or rejected reservations cannot be edited.");
  }

  const startTime = input.startTime
    ? new Date(input.startTime)
    : existing.startTime;
  const endTime = input.endTime ? new Date(input.endTime) : existing.endTime;

  if (input.startTime || input.endTime) {
    const window = validateBookingWindow({ startTime, endTime });
    if (!window.valid) {
      throw validationError(
        window.errors.map((message) => ({ field: "", message })),
      );
    }
  }

  const resourceChanged =
    input.resourceId !== undefined && input.resourceId !== existing.resourceId;
  const resourceId = resourceChanged ? input.resourceId! : existing.resourceId;

  if (resourceChanged && !(await resourceExists(resourceId))) {
    throw conflict("This resource is not available for reservations.");
  }

  const schedulingChanged =
    resourceChanged ||
    (input.startTime !== undefined &&
      new Date(input.startTime).getTime() !== existing.startTime.getTime()) ||
    (input.endTime !== undefined &&
      new Date(input.endTime).getTime() !== existing.endTime.getTime());

  if (schedulingChanged) {
    await assertNoOverlap(resourceId, startTime, endTime, existing.id);
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.notes !== undefined
        ? { notes: normalizeOptionalText(input.notes) }
        : {}),
      ...(input.startTime ? { startTime } : {}),
      ...(input.endTime ? { endTime } : {}),
      ...(resourceChanged ? { resourceId } : {}),
      // A confirmed booking that changes schedule returns to PENDING for re-approval.
      ...(existing.status === "CONFIRMED" && schedulingChanged
        ? {
            status: "PENDING",
            decidedAt: null,
            decidedById: null,
            rejectionReason: null,
          }
        : {}),
    },
    select: reservationSelect,
  });

  return reservation;
}

export async function cancelReservation(
  actor: CurrentUser,
  id: string,
): Promise<ReservationRecord> {
  const existing = await prisma.reservation.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });

  if (!existing) throw notFound("Reservation not found.");
  assertCanModify(actor, existing.userId);

  if (existing.status !== "PENDING" && existing.status !== "CONFIRMED") {
    throw conflict("This reservation cannot be cancelled.");
  }

  return prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    select: reservationSelect,
  });
}

export async function decideReservation(
  actor: CurrentUser,
  id: string,
  input: ReservationDecisionInput,
): Promise<ReservationRecord> {
  if (actor.role !== "ADMIN") {
    throw forbidden("Only administrators can approve or reject reservations.");
  }

  const existing = await prisma.reservation.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) throw notFound("Reservation not found.");
  if (existing.status !== "PENDING") {
    throw conflict("Only pending reservations can be reviewed.");
  }

  const now = new Date();
  const decision =
    input.action === "CONFIRM"
      ? { status: "CONFIRMED" as const, rejectionReason: null }
      : {
          status: "REJECTED" as const,
          rejectionReason: input.rejectionReason ?? null,
        };

  return prisma.reservation.update({
    where: { id },
    data: {
      ...decision,
      decidedAt: now,
      decidedById: actor.id,
    },
    select: reservationSelect,
  });
}

/** Live availability check used by the booking form and admin views. */
export async function checkAvailability(
  resourceId: string,
  startTime: Date,
  endTime: Date,
  excludeReservationId: string | null = null,
): Promise<AvailabilityDTO> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, isActive: true },
  });

  if (!resource) throw notFound("Resource not found.");
  if (!resource.isActive) {
    throw conflict(
      "This resource is currently inactive and cannot be reserved.",
    );
  }

  const conflicts = await prisma.reservation.findMany({
    where: {
      resourceId,
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { id: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  const occupied = conflicts.map(toOccupied);
  const suggestions = suggestNextStartTimes(
    occupied,
    startTime,
    endTime.getTime() - startTime.getTime(),
    3,
  ).map((date) => date.toISOString());

  return {
    available: conflicts.length === 0,
    requested: {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    },
    conflicts: conflicts.map(toWindow),
    suggestions,
  };
}

async function assertNoOverlap(
  resourceId: string,
  startTime: Date,
  endTime: Date,
  excludeId: string | null,
): Promise<void> {
  const conflicting = await prisma.reservation.findMany({
    where: {
      resourceId,
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  if (conflicting.length === 0) return;

  const suggestions = suggestNextStartTimes(
    conflicting.map(toOccupied),
    startTime,
    endTime.getTime() - startTime.getTime(),
    3,
  ).map((date) => date.toISOString());

  throw conflict(
    "This resource already has a reservation during the selected time.",
    "OVERLAP",
    {
      conflicts: conflicting.map(toWindow),
      suggestions,
    },
  );
}

function assertCanModify(actor: CurrentUser, ownerId: string): void {
  if (actor.role !== "ADMIN" && actor.id !== ownerId) {
    throw forbidden("You can only modify your own reservations.");
  }
}
