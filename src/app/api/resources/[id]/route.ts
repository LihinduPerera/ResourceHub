import { NextRequest } from "next/server";
import { withRoute, readJsonBody } from "@/lib/api/route";
import { badRequest, notFound, validationError } from "@/lib/api/errors";
import { formatZodIssues, ok } from "@/lib/api/response";
import { requireAdmin, requireUser } from "@/lib/auth";
import { parseId } from "@/lib/utils/id";
import { updateResourceSchema } from "@/lib/validations";
import {
  getResource,
  setResourceActive,
  updateResource,
} from "@/lib/services/resource";

export const GET = withRoute(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = parseId((await params).id);
    if (!id) throw badRequest("Invalid resource ID.", "INVALID_ID");

    await requireUser(request.headers);

    const resource = await getResource(id);
    if (!resource) throw notFound("Resource not found.");

    return ok(resource);
  },
);

export const PATCH = withRoute(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = parseId((await params).id);
    if (!id) throw badRequest("Invalid resource ID.", "INVALID_ID");

    await requireAdmin(request.headers);

    const body = await readJsonBody(request);

    const validation = updateResourceSchema.safeParse(body);
    if (!validation.success) {
      throw validationError(formatZodIssues(validation.error));
    }

    const resource = await updateResource(id, validation.data);

    return ok(resource);
  },
);

export const DELETE = withRoute(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = parseId((await params).id);
    if (!id) throw badRequest("Invalid resource ID.", "INVALID_ID");

    await requireAdmin(request.headers);

    // Soft delete: resources keep history, inactive resources cannot be booked.
    const resource = await setResourceActive(id, false);

    return ok(resource);
  },
);
