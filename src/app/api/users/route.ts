import { NextRequest } from "next/server";
import { withRoute } from "@/lib/api/route";
import { formatZodIssues, ok } from "@/lib/api/response";
import { validationError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth";
import { listUsersQuerySchema } from "@/lib/validations";
import { listUsers } from "@/lib/services/user";

export const GET = withRoute(async (request: NextRequest) => {
  await requireAdmin(request.headers);

  const query = listUsersQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!query.success) {
    throw validationError(formatZodIssues(query.error));
  }

  const result = await listUsers(query.data);

  return ok(result.data, {
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    pageCount: result.pageCount,
  });
});
