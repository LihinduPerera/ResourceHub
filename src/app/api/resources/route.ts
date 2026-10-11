
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { createResourceSchema } from "@/lib/validations/resource";

export async function GET() {
  try {
    const resources = await prisma.resource.findMany({
      orderBy: [
        { isActive: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ data: resources });
  } catch (error) {
    console.error("Failed to fetch resources:", error);

    return NextResponse.json(
      { error: "Unable to retrieve resources." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const validation = createResourceSchema.safeParse(body);

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

    const resource = await prisma.resource.create({
      data: validation.data,
    });

    return NextResponse.json(
      { data: resource },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must contain valid JSON." },
        { status: 400 },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    console.error("Failed to create resource:", error);

    return NextResponse.json(
      { error: "Unable to create resource." },
      { status: 500 },
    );
  }
}
