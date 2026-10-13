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
    typeof params.resource === "string" ? params.resource.trim() : undefined;

  // Only trust the preselected id when the resource actually exists and is active.
  // Fetch display fields too so the form can show the option even before (or
  // independent of) the async resource list.
  let initialResource:
    | { id: string; name: string; type: string; location: string }
    | undefined;
  let preselectInvalid = false;
  if (resourceParam) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceParam },
      select: { id: true, name: true, type: true, location: true, isActive: true },
    });
    if (resource?.isActive) {
      initialResource = {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        location: resource.location,
      };
    } else {
      preselectInvalid = true;
    }
  }

  return (
    <ReservationForm
      key={initialResource?.id ?? "none"}
      initialResourceId={initialResource?.id}
      initialResource={initialResource}
      preselectInvalid={preselectInvalid}
    />
  );
}
