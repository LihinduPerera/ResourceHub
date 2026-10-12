import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { LIST_LIMITS, type ResourceType } from "@/lib/constants";
import { notFound } from "@/lib/api/errors";
import type {
  CreateResourceInput,
  UpdateResourceInput,
} from "@/lib/validations";
import type { PagedResult } from "@/lib/types";

export const resourceSelect = {
  id: true,
  name: true,
  type: true,
  location: true,
  capacity: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ResourceSelect;

export type ResourceRecord = Prisma.ResourceGetPayload<{
  select: typeof resourceSelect;
}>;

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ResourceType | null;
  includeInactive?: boolean;
};

export async function listResources(
  params: ListParams = {},
): Promise<PagedResult<ResourceRecord>> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    LIST_LIMITS.maxPageSize,
    Math.max(1, Math.floor(params.pageSize ?? LIST_LIMITS.defaultPageSize)),
  );

  const where: Prisma.ResourceWhereInput = {};

  if (!params.includeInactive) where.isActive = true;

  if (params.type) where.type = params.type;

  if (params.search) {
    const query = params.search.trim();
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { location: { contains: query, mode: "insensitive" } },
      ];
    }
  }

  const [total, rows] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: resourceSelect,
    }),
  ]);

  return {
    data: rows,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

export async function getResource(id: string): Promise<ResourceRecord | null> {
  return prisma.resource.findUnique({ where: { id }, select: resourceSelect });
}

export async function createResource(
  input: CreateResourceInput,
): Promise<ResourceRecord> {
  return prisma.resource.create({
    data: {
      name: input.name,
      type: input.type,
      location: input.location,
      capacity: input.capacity,
      description: normalizeOptionalText(input.description),
    },
    select: resourceSelect,
  });
}

export async function updateResource(
  id: string,
  input: UpdateResourceInput,
): Promise<ResourceRecord> {
  const existing = await prisma.resource.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) throw notFound("Resource not found.");

  const data: Prisma.ResourceUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.type !== undefined) data.type = input.type;
  if (input.location !== undefined) data.location = input.location;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.description !== undefined) {
    data.description = normalizeOptionalText(input.description);
  }

  return prisma.resource.update({
    where: { id },
    data,
    select: resourceSelect,
  });
}

export async function setResourceActive(
  id: string,
  isActive: boolean,
): Promise<ResourceRecord> {
  const existing = await prisma.resource.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) throw notFound("Resource not found.");

  return prisma.resource.update({
    where: { id },
    data: { isActive },
    select: resourceSelect,
  });
}

export async function resourceExists(id: string): Promise<boolean> {
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  return resource !== null && resource.isActive;
}

/** Empty or whitespace-only text becomes `null` so the DB stores a real NULL. */
export function normalizeOptionalText(
  value: string | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
