import { NextRequest } from "next/server";
import { withRoute, readJsonBody } from "@/lib/api/route";
import { created, formatZodIssues, ok } from "@/lib/api/response";
import { validationError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth";
import {
  createReservationSchema,
  listReservationsQuerySchema,
} from "@/lib/validations";
import {
  createReservation,
  listReservations,
} from "@/lib/services/reservation";

export const GET = withRoute(async (request: NextRequest) => {
  const actor = await requireUser(request.headers);

  const query = listReservationsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!query.success) {
    throw validationError(formatZodIssues(query.error));
  }

  const mine = request.nextUrl.searchParams.get("mine") === "true";
  const result = await listReservations({ ...query.data, mine }, actor);

  return ok(result.data, {
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    pageCount: result.pageCount,
  });
});

export const POST = withRoute(async (request: NextRequest) => {
  const actor = await requireUser(request.headers);
  const body = await readJsonBody(request);

  const validation = createReservationSchema.safeParse(body);

  if (!validation.success) {
    throw validationError(formatZodIssues(validation.error));
  }

  const reservation = await createReservation(actor, validation.data);

  return created(reservation);
});
