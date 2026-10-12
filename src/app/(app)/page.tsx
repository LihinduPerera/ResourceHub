import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  LibraryBig,
  Plus,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_RESERVATION_STATUSES, ROUTES } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationStatusBadge } from "@/components/shared/ReservationStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  formatDuration,
  formatDayLong,
  formatTime,
  getGreeting,
} from "@/lib/utils/date";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A snapshot of your reservations and the resources on offer."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const now = new Date();
  const scope = isAdmin ? {} : { userId: user.id };

  const [activeResources, reservationCount, upcoming, pendingCount] =
    await Promise.all([
      prisma.resource.count({ where: { isActive: true } }),
      prisma.reservation.count({ where: scope }),
      prisma.reservation.findMany({
        where: {
          ...scope,
          status: { in: [...ACTIVE_RESERVATION_STATUSES] },
          startTime: { gte: now },
        },
        orderBy: { startTime: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
          resource: { select: { id: true, name: true, type: true } },
        },
      }),
      isAdmin
        ? prisma.reservation.count({ where: { status: "PENDING" } })
        : Promise.resolve(0),
    ]);

  const cards = [
    {
      label: "Active resources",
      value: activeResources,
      icon: LibraryBig,
      hint: "available to book",
      href: ROUTES.resources,
    },
    {
      label: isAdmin ? "Total reservations" : "My reservations",
      value: reservationCount,
      icon: CalendarClock,
      hint: "created so far",
      href: ROUTES.reservations,
    },
    ...(isAdmin
      ? [
          {
            label: "Pending approvals",
            value: pendingCount,
            icon: Clock3,
            hint: "awaiting your review",
            href: ROUTES.reservations,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-gradient-to-r from-indigo-50 via-white to-white p-6">
        <p className="text-sm text-muted-foreground">
          {getGreeting(now)}, {user.name.split(" ")[0]}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          {isAdmin
            ? "Here's what needs your attention."
            : "Let's get something booked."}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          {isAdmin
            ? `${pendingCount} reservation${pendingCount === 1 ? "" : "s"} waiting for approval across your space.`
            : "Find a room, workspace, or piece of equipment and reserve it in a few clicks."}
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href={ROUTES.resources}>
              <Plus />
              {isAdmin ? "Manage resources" : "Book a resource"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.hint}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Up next</CardTitle>
            <CardDescription>
              Your upcoming {isAdmin ? "" : "active "}
              reservations.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.reservations}>
              View all
              <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing scheduled"
              description="When you make a reservation it will show up here."
            />
          ) : (
            <ul className="divide-y divide-border/70">
              {upcoming.map((reservation) => (
                <li key={reservation.id}>
                  <Link
                    href={`/reservations/${reservation.id}`}
                    className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {reservation.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {reservation.resource.name} ·{" "}
                        {formatDayLong(reservation.startTime)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-sm font-medium">
                        {formatTime(reservation.startTime)} –{" "}
                        {formatTime(reservation.endTime)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(
                          reservation.startTime,
                          reservation.endTime,
                        )}
                      </p>
                    </div>
                    <ReservationStatusBadge
                      status={reservation.status}
                      className="shrink-0"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
