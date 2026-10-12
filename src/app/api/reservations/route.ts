
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createReservationSchema } from "@/lib/validations/reservation";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const resourceIdParam = searchParams.get("resourceId");
    const statusParam = searchParams.get("status");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limitParam = searchParams.get("limit");

    // 1. Validate resourceId.
    let resourceId: number | undefined;

    if (resourceIdParam !== null) {
      if (!/^[1-9]\d*$/.test(resourceIdParam)) {
        return NextResponse.json(
          { error: "Invalid resourceId." },
          { status: 400 },
        );
      }

      resourceId = Number(resourceIdParam);

      if (!Number.isSafeInteger(resourceId)) {
        return NextResponse.json(
          { error: "Invalid resourceId." },
          { status: 400 },
        );
      }
    }

    // 2. Validate status.
    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "CANCELLED",
    ] as const;

    if (
      statusParam !== null &&
      !(allowedStatuses as readonly string[]).includes(statusParam)
    ) {
      return NextResponse.json(
        {
          error: "Invalid status.",
          allowedValues: allowedStatuses,
        },
        { status: 400 },
      );
    }

    // 3. Validate date filters.
    
    function parseDate(value: string | null): Date | undefined | null {
    if (value === null) return undefined;

    const isValidFormat =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        value,
        );

    if (!isValidFormat) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return date;
    }

    const fromDate = parseDate(fromParam);
    const toDate = parseDate(toParam);

    if (
      (fromParam !== null && fromDate == null) ||
      (toParam !== null && toDate == null)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid date. Use an ISO 8601 datetime with a timezone, such as 2026-10-15T10:00:00+05:30.",
        },
        { status: 400 },
      );
    }

    if (
      fromDate instanceof Date &&
      toDate instanceof Date &&
      fromDate >= toDate
    ) {
      return NextResponse.json(
        { error: "'from' must be earlier than 'to'." },
        { status: 400 },
      );
    }

    // 4. Validate the result limit.
    let limit = 50;

    if (limitParam !== null) {
      if (!/^\d+$/.test(limitParam)) {
        return NextResponse.json(
          { error: "Invalid limit. Use a number from 1 to 100." },
          { status: 400 },
        );
      }

      limit = Number(limitParam);

      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return NextResponse.json(
          { error: "Limit must be between 1 and 100." },
          { status: 400 },
        );
      }
    }

    // 5. Build the database filters.
    const where: Prisma.ReservationWhereInput = {};

    if (resourceId !== undefined) {
      where.resourceId = resourceId;
    }

    if (statusParam !== null) {
      where.status =
        statusParam as (typeof allowedStatuses)[number];
    }

    if (fromDate instanceof Date || toDate instanceof Date) {
      where.startTime = {
        ...(fromDate instanceof Date ? { gte: fromDate } : {}),
        ...(toDate instanceof Date ? { lt: toDate } : {}),
      };
    }

    // 6. Fetch reservations and their related records.
    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: [
        { startTime: "asc" },
        { id: "asc" },
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
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
      },
    });

    return NextResponse.json({
      data: reservations,
      meta: {
        count: reservations.length,
        limit,
      },
    });
  } catch (error) {
    console.error("Failed to fetch reservations:", error);

    return NextResponse.json(
      { error: "Unable to retrieve reservations." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming JSON.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must contain valid JSON." },
        { status: 400 },
      );
    }

    // 2. Validate the request.
    const validation = createReservationSchema.safeParse(body);

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

    const { userId, resourceId, title, startTime, endTime } =
      validation.data;

    // 3. Check the user and resource together.
    const [user, resource] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      prisma.resource.findUnique({
        where: { id: resourceId },
        select: { id: true, isActive: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found." },
        { status: 404 },
      );
    }

    if (!resource.isActive) {
      return NextResponse.json(
        { error: "This resource is not available for reservations." },
        { status: 409 },
      );
    }

    // 4. Create the reservation.
    const reservation = await prisma.reservation.create({
      data: {
        userId,
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

    // 5. Return the created record.
    return NextResponse.json(
      { data: reservation },
      { status: 201 },
    );
  } catch (error) {
    // PostgreSQL exclusion constraint violation:
    // overlapping reservations for the same resource.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2004"
    ) {
      const databaseMessage =
        typeof error.meta?.database_error === "string"
          ? error.meta.database_error
          : "";

      if (
        databaseMessage.includes(
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
        databaseMessage.includes("reservations_valid_time_check")
      ) {
        return NextResponse.json(
          { error: "End time must be after start time." },
          { status: 400 },
        );
      }
    }

    console.error("Failed to create reservation:", error);

    return NextResponse.json(
      { error: "Unable to create reservation." },
      { status: 500 },
    );
  }
}
