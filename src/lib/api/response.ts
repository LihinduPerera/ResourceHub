import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { ApiError } from "./errors";

/** Standard pagination metadata attached to list responses. */
export type ApiMeta = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
} & Record<string, unknown>;

export function ok<T>(data: T, meta?: ApiMeta) {
  return NextResponse.json(meta ? { data, meta } : { data });
}

export function created<T>(data: T, meta?: ApiMeta) {
  return NextResponse.json(meta ? { data, meta } : { data }, { status: 201 });
}

export function fail(error: ApiError): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    },
    { status: error.status },
  );
}

/** Normalises Zod issues into `{ field, message }` entries for forms and APIs. */
export function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}
