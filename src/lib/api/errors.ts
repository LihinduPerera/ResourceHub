/**
 * Application-level errors with an HTTP status and a stable machine-readable
 * code. Route handlers convert these into the standard error envelope.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(
  message: string,
  code = "BAD_REQUEST",
  details?: unknown,
) {
  return new ApiError(400, code, message, details);
}

export function unauthorized(
  message = "You must be signed in.",
  code = "UNAUTHORIZED",
) {
  return new ApiError(401, code, message);
}

export function forbidden(
  message = "You do not have permission to do this.",
  code = "FORBIDDEN",
) {
  return new ApiError(403, code, message);
}

export function notFound(
  message = "The requested resource was not found.",
  code = "NOT_FOUND",
) {
  return new ApiError(404, code, message);
}

export function conflict(
  message: string,
  code = "CONFLICT",
  details?: unknown,
) {
  return new ApiError(409, code, message, details);
}

export function validationError(details: unknown) {
  return new ApiError(400, "VALIDATION", "Validation failed.", details);
}

export function internalError() {
  return new ApiError(
    500,
    "INTERNAL",
    "Something went wrong. Please try again.",
  );
}
