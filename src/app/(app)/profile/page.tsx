import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  UserRound,
  XCircle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_RESERVATION_STATUSES, USER_ROLE_META } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationStatusBadge } from "@/components/shared/ReservationStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime, formatDuration } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your account details and activity."
      />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}

async function ProfileContent() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [
    reservationCount,
    pendingCount,
    confirmedCount,
    rejectedCount,
    recent,
  ] = await Promise.all([
    prisma.reservation.count({ where: { userId: user.id } }),
    prisma.reservation.count({ where: { userId: user.id, status: "PENDING" } }),
    prisma.reservation.count({
      where: { userId: user.id, status: "CONFIRMED" },
    }),
    prisma.reservation.count({
      where: { userId: user.id, status: "REJECTED" },
    }),
    prisma.reservation.findMany({
      where: {
        userId: user.id,
        status: { in: [...ACTIVE_RESERVATION_STATUSES] },
      },
      orderBy: { startTime: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        startTime: true,
        endTime: true,
        resource: { select: { name: true } },
      },
    }),
  ]);

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const roleMeta = USER_ROLE_META[user.role];

  const stats = [
    { label: "Total", value: reservationCount, icon: CalendarClock },
    { label: "Pending", value: pendingCount, icon: Clock3 },
    { label: "Confirmed", value: confirmedCount, icon: CheckCircle2 },
    { label: "Rejected", value: rejectedCount, icon: XCircle },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center pt-8 text-center">
            <Avatar className="h-20 w-20 text-lg">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-lg font-semibold">{user.name}</h2>
            <Badge variant="outline" className={`mt-1.5 ${roleMeta.badge}`}>
              {roleMeta.label}
            </Badge>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>
              All-time summary of your reservations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border p-3">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              Recent &amp; upcoming
            </CardTitle>
            <CardDescription>
              Your active or pending reservations.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/reservations">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing here yet"
              description="Make your first reservation to see it listed here."
              action={
                <Button asChild>
                  <Link href="/reservations/new">New reservation</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border/70">
              {recent.map((reservation) => (
                <li
                  key={reservation.id}
                  className="flex items-center gap-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/reservations/${reservation.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {reservation.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {reservation.resource.name} ·{" "}
                      {formatDateTime(reservation.startTime)} ·{" "}
                      {formatDuration(
                        reservation.startTime,
                        reservation.endTime,
                      )}
                    </p>
                  </div>
                  <ReservationStatusBadge status={reservation.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
