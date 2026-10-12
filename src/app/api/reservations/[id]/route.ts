
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { updateReservationSchema } from "@/lib/validations/reservation";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseReservationId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function isConstraintViolation(
  error: unknown,
  constraintName: string,
): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2004"
  ) {
    return false;
  }

  const databaseMessage =
    typeof error.meta?.database_error === "string"
      ? error.meta.database_error
      : "";

  return databaseMessage.includes(constraintName);
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  const { id: rawId } = await params;
  const id = parseReservationId(rawId);

  if (id === null) {
    return NextResponse.json(
      { error: "Invalid reservation ID." },
      { status: 400 },
    );
  }

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must contain valid JSON." },
        { status: 400 },
      );
    }

    const validation = updateReservationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const existing = await prisma.reservation.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 },
      );
    }

    if (existing.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cancelled reservations cannot be updated." },
        { status: 409 },
      );
    }

    const { resourceId, title, startTime, endTime } =
      validation.data;

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, isActive: true },
    });

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found." },
        { status: 404 },
      );
    }

    if (!resource.isActive) {
      return NextResponse.json(
        { error: "This resource is not active." },
        { status: 409 },
      );
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        resourceId,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        resource: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json({ data: reservation });
  } catch (error) {
    if (
      isConstraintViolation(
        error,
        "reservations_no_overlapping_active_bookings",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This resource already has a reservation during the selected time.",
        },
        { status: 409 },
      );
    }

    if (
      isConstraintViolation(
        error,
        "reservations_valid_time_check",
      )
    ) {
      return NextResponse.json(
        { error: "End time must be after start time." },
        { status: 400 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 },
      );
    }

    console.error("Failed to update reservation:", error);

    return NextResponse.json(
      { error: "Unable to update reservation." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  const { id: rawId } = await params;
  const id = parseReservationId(rawId);

  if (id === null) {
    return NextResponse.json(
      { error: "Invalid reservation ID." },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.reservation.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 },
      );
    }

    if (existing.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Reservation is already cancelled." },
        { status: 409 },
      );
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      data: reservation,
      message: "Reservation cancelled successfully.",
    });
  } catch (error) {
    console.error("Failed to cancel reservation:", error);

    return NextResponse.json(
      { error: "Unable to cancel reservation." },
      { status: 500 },
    );
  }
}
