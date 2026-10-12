import { NextRequest } from "next/server";
import { withRoute, readJsonBody } from "@/lib/api/route";
import { badRequest, validationError } from "@/lib/api/errors";
import { formatZodIssues, ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { parseId } from "@/lib/utils/id";
import { updateUserRoleSchema } from "@/lib/validations";
import { assertNotLastAdmin, updateUserRole } from "@/lib/services/user";

export const PATCH = withRoute(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = parseId((await params).id);
    if (!id) throw badRequest("Invalid user ID.", "INVALID_ID");

    const actor = await requireAdmin(request.headers);

    const body = await readJsonBody(request);

    const validation = updateUserRoleSchema.safeParse(body);
    if (!validation.success) {
      throw validationError(formatZodIssues(validation.error));
    }

    await assertNotLastAdmin(actor.id, id, validation.data.role);

    const user = await updateUserRole(id, validation.data.role);

    return ok(user);
  },
);
