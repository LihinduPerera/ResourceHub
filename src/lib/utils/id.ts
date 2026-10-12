/**
 * Identifier helpers.
 *
 * Model IDs are opaque strings (cuid / Better Auth ids). Route params and
 * client-provided values are validated against a safe character set before they
 * ever reach Prisma.
 */

const ID_PATTERN = /^[a-zA-Z0-9_-]{6,128}$/;

export function isValidId(value: string): boolean {
  return ID_PATTERN.test(value);
}

export function parseId(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  return ID_PATTERN.test(value) ? value : null;
}
