import { NextRequest } from "next/server";
import { withRoute, readJsonBody } from "@/lib/api/route";
import {
  badRequest,
  forbidden,
  notFound,
  validationError,
} from "@/lib/api/errors";
import { formatZodIssues, ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth";
import { parseId } from "@/lib/utils/id";
import { updateReservationSchema } from "@/lib/validations";
import {
  cancelReservation,
  getReservation,
  updateReservation,
} from "@/lib/services/reservation";

export const GET = withRoute(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = parseId((await params).id);
    if (!id) throw badRequest("Invalid reservation ID.", "INVALID_ID");

    const actor = await requireUser(request.headers);
    const reservation = await getReservation(id);

    if (!reservation) throw notFound("Reservation not found.");
    if (actor.role !== "ADMIN" && reservation.user.id !== actor.id) {
      throw forbidden("You can only view your own reservations.");
    }

    return ok(reservation);
  },
);

export const PATCH = withRoute(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = parseId((await params).id);
    if (!id) throw badRequest("Invalid reservation ID.", "INVALID_ID");

    const actor = await requireUser(request.headers);
    const body = await readJsonBody(request);

    const validation = updateReservationSchema.safeParse(body);
    if (!validation.success) {
      throw validationError(formatZodIssues(validation.error));
    }

    const reservation = await updateReservation(actor, id, validation.data);

    return ok(reservation);
  },
);

export const DELETE = withRoute(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = parseId((await params).id);
    if (!id) throw badRequest("Invalid reservation ID.", "INVALID_ID");

    const actor = await requireUser(request.headers);
    const reservation = await cancelReservation(actor, id);

    return ok(reservation);
  },
);
