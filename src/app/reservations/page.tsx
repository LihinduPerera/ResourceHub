
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ReservationForm from "./ReservationForm";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    CONFIRMED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

async function ReservationsContent() {
  await connection();

  const [resources, reservations] = await Promise.all([
    prisma.resource.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        capacity: true,
      },
    }),

    prisma.reservation.findMany({
      orderBy: [{ startTime: "desc" }, { id: "desc" }],
      take: 30,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        user: {
          select: { name: true, email: true },
        },
        resource: {
          select: { name: true },
        },
      },
    }),
  ]);

  const activeCount = reservations.filter(
    (reservation) => reservation.status !== "CANCELLED",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Reservations
            </h1>

            <p className="mt-2 text-slate-600">
              Create bookings and review existing reservations.
            </p>
          </div>

          <Link
            href="/resources"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-100"
          >
            Manage resources
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Create a reservation</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a resource and choose your booking time.
            </p>

            <div className="mt-6">
              <ReservationForm resources={resources} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Recent reservations</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing the latest {reservations.length} records.
                </p>
              </div>

              <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                {activeCount} not cancelled
              </span>
            </div>

            {reservations.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <p className="font-medium">No reservations yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Create your first reservation using the form.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {reservations.map((reservation) => (
                  <article
                    key={reservation.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {reservation.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {reservation.resource.name}
                        </p>
                      </div>

                      <StatusBadge status={reservation.status} />
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-800">
                          Starts:
                        </span>{" "}
                        {formatDateTime(reservation.startTime)}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Ends:
                        </span>{" "}
                        {formatDateTime(reservation.endTime)}
                      </p>

                      <p className="sm:col-span-2">
                        <span className="font-medium text-slate-800">
                          Booked by:
                        </span>{" "}
                        {reservation.user.name} ({reservation.user.email})
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense
      fallback={
        <main className="p-8 text-slate-600">
          Loading reservations...
        </main>
      }
    >
      <ReservationsContent />
    </Suspense>
  );
}
