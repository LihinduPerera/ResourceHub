import { NextRequest } from "next/server";
import { withRoute, readJsonBody } from "@/lib/api/route";
import { created, formatZodIssues, ok } from "@/lib/api/response";
import { validationError } from "@/lib/api/errors";
import { requireAdmin, requireUser } from "@/lib/auth";
import {
  createResourceSchema,
  listResourcesQuerySchema,
} from "@/lib/validations";
import { createResource, listResources } from "@/lib/services/resource";

export const GET = withRoute(async (request: NextRequest) => {
  const actor = await requireUser(request.headers);

  const query = listResourcesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!query.success) {
    throw validationError(formatZodIssues(query.error));
  }

  const result = await listResources({
    page: query.data.page,
    pageSize: query.data.pageSize,
    search: query.data.search,
    type: query.data.type,
    includeInactive:
      actor.role === "ADMIN" && query.data.includeInactive === "true",
  });

  return ok(result.data, {
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    pageCount: result.pageCount,
  });
});

export const POST = withRoute(async (request: NextRequest) => {
  await requireAdmin(request.headers);

  const body = await readJsonBody(request);

  const validation = createResourceSchema.safeParse(body);
  if (!validation.success) {
    throw validationError(formatZodIssues(validation.error));
  }

  const resource = await createResource(validation.data);

  return created(resource);
});
