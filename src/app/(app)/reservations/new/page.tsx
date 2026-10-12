import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationForm } from "@/components/reservations/ReservationForm";

export const metadata: Metadata = { title: "New reservation" };

export default function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div>
      <PageHeader
        title="New reservation"
        description="Request a slot — an administrator will confirm it shortly after."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        }
      >
        <NewReservationContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewReservationContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const resourceParam =
    typeof params.resource === "string" ? params.resource : undefined;

  // Only trust the preselected id when the resource actually exists and is active.
  let initialResourceId: string | undefined;
  if (resourceParam) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceParam },
      select: { id: true, isActive: true },
    });
    if (resource?.isActive) initialResourceId = resource.id;
  }

  return <ReservationForm initialResourceId={initialResourceId} />;
}
