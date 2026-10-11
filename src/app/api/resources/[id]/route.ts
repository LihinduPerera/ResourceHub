
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { updateResourceSchema } from "@/lib/validations/resource";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseResourceId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  const { id: rawId } = await params;
  const id = parseResourceId(rawId);

  if (id === null) {
    return NextResponse.json(
      { error: "Invalid resource ID." },
      { status: 400 },
    );
  }

  try {
    const body: unknown = await request.json();
    const validation = updateResourceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ data: resource });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must contain valid JSON." },
        { status: 400 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Resource not found." },
        { status: 404 },
      );
    }

    console.error("Failed to update resource:", error);

    return NextResponse.json(
      { error: "Unable to update resource." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  const { id: rawId } = await params;
  const id = parseResourceId(rawId);

  if (id === null) {
    return NextResponse.json(
      { error: "Invalid resource ID." },
      { status: 400 },
    );
  }

  try {
    const resource = await prisma.resource.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ data: resource });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Resource not found." },
        { status: 404 },
      );
    }

    console.error("Failed to deactivate resource:", error);

    return NextResponse.json(
      { error: "Unable to deactivate resource." },
      { status: 500 },
    );
  }
}
