import { NextRequest } from "next/server";
import { withRoute, readJsonBody } from "@/lib/api/route";
import { badRequest, validationError } from "@/lib/api/errors";
import { formatZodIssues, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { parseId } from "@/lib/utils/id";
import { reservationDecisionSchema } from "@/lib/validations";
import { decideReservation } from "@/lib/services/reservation";

export const POST = withRoute(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = parseId((await params).id);
    if (!id) throw badRequest("Invalid reservation ID.", "INVALID_ID");

    const actor = await requireAdmin(request.headers);
    const body = await readJsonBody(request);

    const validation = reservationDecisionSchema.safeParse(body);
    if (!validation.success) {
      throw validationError(formatZodIssues(validation.error));
    }

    const reservation = await decideReservation(actor, id, validation.data);

    return ok(reservation);
  },
);
