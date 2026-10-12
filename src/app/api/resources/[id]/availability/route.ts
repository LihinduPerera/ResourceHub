
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseResourceId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function parseDate(value: string | null): Date | null {
  if (value === null) return null;

  const isValidFormat =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    );

  if (!isValidFormat) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  const { id: rawId } = await params;
  const resourceId = parseResourceId(rawId);

  if (resourceId === null) {
    return NextResponse.json(
      { error: "Invalid resource ID." },
      { status: 400 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = parseDate(fromParam);
  const to = parseDate(toParam);

  if (!from || !to) {
    return NextResponse.json(
      {
        error:
          "Both from and to are required ISO 8601 datetimes with timezones.",
        example: {
          from: "2026-10-15T10:00:00+05:30",
          to: "2026-10-15T11:00:00+05:30",
        },
      },
      { status: 400 },
    );
  }

  if (from >= to) {
    return NextResponse.json(
      { error: "'from' must be earlier than 'to'." },
      { status: 400 },
    );
  }

  try {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
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

    const conflictingReservation =
      await prisma.reservation.findFirst({
        where: {
          resourceId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          startTime: { lt: to },
          endTime: { gt: from },
        },
        select: { id: true },
      });

    return NextResponse.json({
      data: {
        resource,
        from: from.toISOString(),
        to: to.toISOString(),
        available: conflictingReservation === null,
      },
    });
  } catch (error) {
    console.error("Failed to check resource availability:", error);

    return NextResponse.json(
      { error: "Unable to check resource availability." },
      { status: 500 },
    );
  }
}
