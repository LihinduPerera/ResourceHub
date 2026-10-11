
type Reservation = {
  id: number;
  title: string;
  resource: string;
  date: string;
  time: string;
  status: "Confirmed" | "Pending";
};

const reservations: Reservation[] = [
  {
    id: 1,
    title: "Weekly team meeting",
    resource: "Conference Room A",
    date: "Oct 12, 2026",
    time: "09:00 – 10:00",
    status: "Confirmed",
  },
  {
    id: 2,
    title: "Product planning",
    resource: "Meeting Room B",
    date: "Oct 12, 2026",
    time: "10:30 – 11:30",
    status: "Confirmed",
  },
  {
    id: 3,
    title: "Design review",
    resource: "Conference Room A",
    date: "Oct 12, 2026",
    time: "13:00 – 14:00",
    status: "Pending",
  },
  {
    id: 4,
    title: "Client presentation",
    resource: "Presentation Room",
    date: "Oct 13, 2026",
    time: "14:00 – 15:00",
    status: "Confirmed",
  },
];

const navigation = [
  { label: "Overview", symbol: "◫", active: true },
  { label: "Resources", symbol: "▦", active: false },
  { label: "Reservations", symbol: "▤", active: false },
];

function StatusBadge({
  status,
}: {
  status: Reservation["status"];
}) {
  const styles =
    status === "Confirmed"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {status}
    </span>
  );
}

export default function HomePage() {
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
                MONDAY, OCTOBER 12, 2026
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
              {[
                {
                  label: "Total resources",
                  value: "12",
                  detail: "Across all locations",
                  symbol: "▦",
                },
                {
                  label: "Available now",
                  value: "8",
                  detail: "Ready to be reserved",
                  symbol: "✓",
                },
                {
                  label: "Today's reservations",
                  value: "6",
                  detail: "Across all resources",
                  symbol: "▤",
                },
                {
                  label: "Pending requests",
                  value: "2",
                  detail: "Awaiting confirmation",
                  symbol: "◷",
                },
              ].map((stat) => (
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
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
                Demonstration data only — database integration
                comes next.
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
