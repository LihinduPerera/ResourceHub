import { type NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { ApiError, badRequest, internalError } from "./errors";
import { fail } from "./response";

/**
 * Wraps a route handler with centralised error handling: `ApiError`s are
 * returned as-is, Prisma errors are mapped to friendly status codes, and
 * anything unexpected becomes a 500.
 */
export function withRoute<Ctx>(
  handler: (
    request: NextRequest,
    context: Ctx,
  ) => Promise<NextResponse> | NextResponse,
) {
  return async (request: NextRequest, context: Ctx): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Request body must contain valid JSON.", "INVALID_JSON");
  }
}

export function handleRouteError(error: unknown): NextResponse {
  // Let Next.js handle its own control-flow errors (prerender bail-outs,
  // redirects, notFound) rather than reporting them as unexpected 500s.
  unstable_rethrow(error);

  if (error instanceof ApiError) {
    return fail(error);
  }

  const mapped = mapPrismaError(error);
  if (mapped) return fail(mapped);

  console.error("[api] Unhandled error:", error);
  return fail(internalError());
}

function mapPrismaError(error: unknown): ApiError | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;

  switch (error.code) {
    case "P2004": {
      const databaseMessage =
        typeof error.meta?.database_error === "string"
          ? error.meta.database_error
          : "";

      if (
        databaseMessage.includes("reservations_no_overlapping_active_bookings")
      ) {
        return new ApiError(
          409,
          "OVERLAP",
          "This resource already has a reservation during the selected time.",
        );
      }

      if (databaseMessage.includes("reservations_valid_time_check")) {
        return new ApiError(
          400,
          "VALIDATION",
          "End time must be after the start time.",
        );
      }

      return new ApiError(
        400,
        "DB_CONSTRAINT",
        "A database constraint was violated.",
      );
    }

    case "P2025":
      return new ApiError(
        404,
        "NOT_FOUND",
        "The requested record was not found.",
      );

    case "P2002":
      return new ApiError(
        409,
        "DUPLICATE",
        "A record with the same unique value already exists.",
      );

    case "P2003":
      return new ApiError(
        409,
        "RELATION",
        "The operation references a related record that does not exist.",
      );

    default:
      return null;
  }
}
