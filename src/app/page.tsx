
import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

type ReservationStatus = "CONFIRMED" | "PENDING" | "CANCELLED";

type ReservationRow = {
  id: number;
  title: string;
  resource: string;
  date: string;
  time: string;
  status: ReservationStatus;
};

function getSriLankaDayBounds(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  const date = `${values.year}-${values.month}-${values.day}`;
  const start = new Date(`${date}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatToday(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
    .format(date)
    .toUpperCase();
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const styles: Record<ReservationStatus, string> = {
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    PENDING: "bg-amber-50 text-amber-700",
    CANCELLED: "bg-slate-100 text-slate-600",
  };

  const labels: Record<ReservationStatus, string> = {
    CONFIRMED: "Confirmed",
    PENDING: "Pending",
    CANCELLED: "Cancelled",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

const navigation = [
  { label: "Overview", symbol: "◫", active: true },
  { label: "Resources", symbol: "▦", active: false },
  { label: "Reservations", symbol: "▤", active: false },
];

async function DashboardContent() {
  // This tells Next.js that the following work needs a real request.
  await connection();

  const now = new Date();
  const { start: todayStart, end: todayEnd } =
    getSriLankaDayBounds(now);

  const activeStatuses = ["PENDING", "CONFIRMED"] as const;

  const [
    totalResources,
    availableNow,
    todaysReservations,
    pendingRequests,
    upcomingRecords,
  ] = await Promise.all([
    // Count active resources.
    prisma.resource.count({
      where: { isActive: true },
    }),

    // Count active resources without a booking happening right now.
    prisma.resource.count({
      where: {
        isActive: true,
        reservations: {
          none: {
            status: { in: [...activeStatuses] },
            startTime: { lt: now },
            endTime: { gt: now },
          },
        },
      },
    }),

    // Count active reservations starting today in Sri Lanka.
    prisma.reservation.count({
      where: {
        startTime: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: { in: [...activeStatuses] },
      },
    }),

    // Count reservations awaiting confirmation.
    prisma.reservation.count({
      where: { status: "PENDING" },
    }),

    // Fetch the next five active reservations.
    prisma.reservation.findMany({
      where: {
        startTime: { gte: now },
        status: { in: [...activeStatuses] },
      },
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        resource: {
          select: { name: true },
        },
      },
    }),
  ]);

  const reservations: ReservationRow[] = upcomingRecords.map(
    (reservation) => ({
      id: reservation.id,
      title: reservation.title,
      resource: reservation.resource.name,
      date: formatDate(reservation.startTime),
      time: `${formatTime(reservation.startTime)} – ${formatTime(
        reservation.endTime,
      )}`,
      status: reservation.status,
    }),
  );

  const stats = [
    {
      label: "Total resources",
      value: String(totalResources),
      detail: "Active resources",
      symbol: "▦",
    },
    {
      label: "Available now",
      value: String(availableNow),
      detail: "No active booking right now",
      symbol: "✓",
    },
    {
      label: "Today's reservations",
      value: String(todaysReservations),
      detail: "Starting today",
      symbol: "▤",
    },
    {
      label: "Pending requests",
      value: String(pendingRequests),
      detail: "Awaiting confirmation",
      symbol: "◷",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col bg-[#17243a] p-6 text-white md:flex">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 font-bold text-slate-950">
              R
            </div>

            <div>
              <h1 className="text-lg font-bold">ResourceHub</h1>
              <p className="text-xs text-slate-400">
                Workspace management
              </p>
            </div>
          </div>

          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Workspace
          </p>

          <nav className="space-y-2">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={
                  item.label === "Overview"
                    ? "/"
                    : item.label === "Resources"
                      ? "/resources"
                      : "/reservations"
                }
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  item.active
                    ? "bg-teal-400 text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.symbol}</span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold">ResourceHub</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              A central place to manage shared resources and
              avoid scheduling conflicts.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 md:px-10">
            <div>
              <p className="text-sm text-slate-500">
                Workspace / Overview
              </p>
              <h2 className="mt-1 text-xl font-bold md:text-2xl">
                Dashboard
              </h2>
            </div>

            <a
              href="/reservations"
              className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              + New reservation
            </a>
          </header>

          <div className="space-y-8 p-5 md:p-10">
            <div>
              <p className="text-sm font-medium text-teal-700">
                {formatToday(now)}
              </p>

              <h3 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                Your workspace at a glance
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Manage shared spaces and keep your team&apos;s
                schedule organized.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      {stat.label}
                    </p>

                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 font-semibold text-teal-700">
                      {stat.symbol}
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-bold">
                    {stat.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {stat.detail}
                  </p>
                </article>
              ))}
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 md:p-6">
                <div>
                  <h3 className="text-lg font-bold">
                    Upcoming reservations
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    A quick look at scheduled resource usage.
                  </p>
                </div>

                <a
                  href="/reservations"
                  className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  View all →
                </a>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">
                        Reservation
                      </th>
                      <th className="px-6 py-4 font-semibold">
                        Resource
                      </th>
                      <th className="px-6 py-4 font-semibold">
                        Date &amp; time
                      </th>
                      <th className="px-6 py-4 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {reservations.map((reservation) => (
                      <tr
                        key={reservation.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-5 font-semibold">
                          {reservation.title}
                        </td>

                        <td className="px-6 py-5 text-slate-600">
                          {reservation.resource}
                        </td>

                        <td className="px-6 py-5">
                          <p>{reservation.date}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {reservation.time}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <StatusBadge status={reservation.status} />
                        </td>
                      </tr>
                    ))}

                    {reservations.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-slate-500"
                        >
                          No upcoming reservations yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
                Live data from PostgreSQL
              </div>
            </section>

            <footer className="text-center text-xs text-slate-400">
              ResourceHub · Resource Reservation Management
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] text-slate-600">
          Loading your dashboard...
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
