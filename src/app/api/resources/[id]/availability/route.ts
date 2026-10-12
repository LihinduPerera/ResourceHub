import { NextRequest } from "next/server";
import { withRoute } from "@/lib/api/route";
import { badRequest } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth";
import { parseId } from "@/lib/utils/id";
import { checkAvailability } from "@/lib/services/reservation";

export const GET = withRoute(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = parseId((await params).id);
    if (!id) throw badRequest("Invalid resource ID.", "INVALID_ID");

    await requireUser(request.headers);

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;

    if (
      !start ||
      !end ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end.getTime() <= start.getTime()
    ) {
      throw badRequest(
        "Valid `from` and `to` ISO timestamps are required.",
        "INVALID_WINDOW",
      );
    }

    const availability = await checkAvailability(id, start, end);

    return ok(availability);
  },
);
