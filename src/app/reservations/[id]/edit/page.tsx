
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditReservationForm from "./EditReservationForm";

type Props = {
  params: Promise<{ id: string }>;
};

async function EditReservationContent({ params }: Props) {
  await connection();

  const { id } = await params;
  const reservationId = Number(id);

  if (!Number.isSafeInteger(reservationId) || reservationId < 1) {
    notFound();
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      status: true,
      resourceId: true,
    },
  });

  if (!reservation || reservation.status === "CANCELLED") {
    notFound();
  }

  const resources = await prisma.resource.findMany({
    where: {
      isActive: true,
      OR: [
        { id: reservation.resourceId },
        { reservations: { some: { id: reservation.id } } },
      ],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      capacity: true,
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/reservations"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to reservations
        </Link>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">Edit reservation</h1>
          <p className="mt-2 text-sm text-slate-600">
            Update the booking details. The system will reject conflicting
            time slots.
          </p>

          <div className="mt-6">
            <EditReservationForm
              reservation={{
                id: reservation.id,
                title: reservation.title,
                startTime: reservation.startTime.toISOString(),
                endTime: reservation.endTime.toISOString(),
                resourceId: reservation.resourceId,
              }}
              resources={resources}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EditReservationPage(props: Props) {
  return (
    <Suspense fallback={<main className="p-8">Loading reservation...</main>}>
      <EditReservationContent {...props} />
    </Suspense>
  );
}
