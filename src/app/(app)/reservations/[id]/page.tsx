import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Mail,
  MapPin,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getReservation } from "@/lib/services/reservation";
import { prisma } from "@/lib/prisma";
import { RESOURCE_TYPE_META } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReservationStatusBadge } from "@/components/shared/ReservationStatusBadge";
import { ReservationDetailActions } from "@/components/reservations/ReservationDetailActions";
import { formatDateTime, formatDuration, formatTime } from "@/lib/utils/date";
import type { ReservationStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "Reservation" };

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground"
      >
        <Link href="/reservations">
          <ArrowLeft />
          Back to reservations
        </Link>
      </Button>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <Skeleton className="h-80 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        }
      >
        <ReservationDetailContent params={params} />
      </Suspense>
    </div>
  );
}

async function ReservationDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{6,128}$/.test(id)) notFound();

  const reservation = await getReservation(id);
  if (!reservation) notFound();

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && reservation.user.id !== user.id) notFound();

  const decidedBy = reservation.decidedById
    ? await prisma.user.findUnique({
        where: { id: reservation.decidedById },
        select: { name: true },
      })
    : null;

  const serializable = {
    id: reservation.id,
    status: reservation.status as ReservationStatus,
    userId: reservation.user.id,
    resourceId: reservation.resource.id,
    title: reservation.title,
    notes: reservation.notes,
    startTime: reservation.startTime.toISOString(),
    endTime: reservation.endTime.toISOString(),
  };

  const meta = RESOURCE_TYPE_META[reservation.resource.type];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">
              {reservation.title}
            </h1>
            <ReservationStatusBadge status={reservation.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Requested {formatDateTime(reservation.createdAt)}
          </p>
        </div>
        <ReservationDetailActions
          reservation={serializable}
          actor={{ id: user.id, role: user.role }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Starts
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {formatDateTime(reservation.startTime)}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Ends
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {formatDateTime(reservation.endTime)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-muted-foreground">
                Duration:{" "}
                <span className="font-medium text-foreground">
                  {formatDuration(reservation.startTime, reservation.endTime)}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reservation.notes ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {reservation.notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No notes were provided.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status history</CardTitle>
              <CardDescription>Key events on this reservation.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-5 border-l border-border pl-5">
                <TimelineItem
                  dot="bg-primary"
                  title="Reservation requested"
                  meta={formatDateTime(reservation.createdAt)}
                />
                {reservation.status === "CONFIRMED" ||
                reservation.status === "REJECTED" ? (
                  <TimelineItem
                    dot={
                      reservation.status === "CONFIRMED"
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }
                    title={
                      reservation.status === "CONFIRMED"
                        ? "Confirmed"
                        : "Rejected"
                    }
                    meta={
                      reservation.decidedAt
                        ? formatDateTime(reservation.decidedAt)
                        : undefined
                    }
                    description={
                      reservation.status === "REJECTED" &&
                      reservation.rejectionReason
                        ? `Reason: ${reservation.rejectionReason}`
                        : decidedBy
                          ? `Decided by ${decidedBy.name}`
                          : undefined
                    }
                    last={
                      reservation.status === "REJECTED" &&
                      reservation.cancelledAt === null
                    }
                  />
                ) : null}
                {reservation.status === "CANCELLED" &&
                reservation.cancelledAt ? (
                  <TimelineItem
                    dot="bg-slate-400"
                    title="Cancelled"
                    meta={formatDateTime(reservation.cancelledAt)}
                    last
                  />
                ) : null}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                Resource
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{reservation.resource.name}</p>
              <Badge variant="outline" className="font-medium">
                {meta.label}
              </Badge>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {reservation.resource.location}
              </p>
            </CardContent>
          </Card>

          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  Requested by
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {reservation.user.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {reservation.user.name}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {reservation.user.email}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {reservation.status === "CONFIRMED" ? (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="pt-6">
                <p className="text-sm text-emerald-800">
                  This reservation is confirmed and holds the slot on{" "}
                  {formatTime(reservation.startTime)} — show up on time!
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  dot,
  title,
  meta,
  description,
  last,
}: {
  dot: string;
  title: string;
  meta?: string;
  description?: string;
  last?: boolean;
}) {
  return (
    <li className={`relative ${last ? "" : "pb-2"}`}>
      <span
        className={`absolute top-1 -left-5 h-[11px] w-[11px] rounded-full ring-4 ring-background ${dot}`}
      />
      <p className="text-sm font-medium">{title}</p>
      {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </li>
  );
}
