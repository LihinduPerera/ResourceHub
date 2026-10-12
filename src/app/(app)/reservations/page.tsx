import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, CalendarX2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listReservations } from "@/lib/services/reservation";
import { prisma } from "@/lib/prisma";
import {
  LIST_LIMITS,
  RESERVATION_STATUSES,
  type ReservationStatus,
} from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReservationFilters } from "@/components/reservations/ReservationFilters";
import { ReservationRowActions } from "@/components/reservations/ReservationRowActions";
import { ReservationStatusBadge } from "@/components/shared/ReservationStatusBadge";
import { PaginationLinks } from "@/components/shared/PaginationLinks";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime, formatDuration } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Reservations" };

type SearchParams = Record<string, string | string[] | undefined>;

export default function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div>
      <PageHeader
        title="Reservations"
        description="Request a slot, watch its status, and manage your bookings."
      >
        <Button asChild>
          <Link href="/reservations/new">
            <CalendarPlus />
            New reservation
          </Link>
        </Button>
      </PageHeader>
      <Suspense fallback={<ReservationsSkeleton />}>
        <ReservationsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ReservationsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const params = await searchParams;

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const search =
    typeof params.search === "string" && params.search.trim()
      ? params.search.trim()
      : undefined;
  const rawStatus =
    typeof params.status === "string" ? params.status : undefined;
  const status = RESERVATION_STATUSES.includes(rawStatus as ReservationStatus)
    ? (rawStatus as ReservationStatus)
    : undefined;
  const mine = params.mine === "true";
  const resourceId =
    typeof params.resourceId === "string" ? params.resourceId : undefined;

  const [result, resources] = await Promise.all([
    listReservations(
      {
        page,
        pageSize: LIST_LIMITS.defaultPageSize,
        search,
        status,
        mine,
        resourceId,
      },
      user,
    ),
    isAdmin
      ? prisma.resource.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
          take: LIST_LIMITS.maxTake,
        })
      : Promise.resolve([]),
  ]);

  const filterParams = new URLSearchParams();
  if (search) filterParams.set("search", search);
  if (status) filterParams.set("status", status);
  if (isAdmin && mine) filterParams.set("mine", "true");
  if (resourceId) filterParams.set("resourceId", resourceId);

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams(filterParams);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/reservations?${query}` : "/reservations";
  };

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ReservationFilters
          isAdmin={isAdmin}
          showResourceFilter={isAdmin}
          resourceOptions={resources}
        />
      </Suspense>

      {result.total === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="No reservations found"
          description="Try adjusting the filters, or make your first request."
          action={
            <Button asChild>
              <Link href="/reservations/new">
                <CalendarPlus />
                New reservation
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {result.total} reservation{result.total === 1 ? "" : "s"} found
          </p>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Resource</TableHead>
                  {isAdmin ? <TableHead>Requested by</TableHead> : null}
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="max-w-52">
                      <Link
                        href={`/reservations/${reservation.id}`}
                        className="block truncate font-medium text-foreground hover:underline"
                      >
                        {reservation.title}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-40">
                      <p className="truncate">{reservation.resource.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {reservation.resource.location}
                      </p>
                    </TableCell>
                    {isAdmin ? (
                      <TableCell>{reservation.user.name}</TableCell>
                    ) : null}
                    <TableCell className="whitespace-nowrap">
                      <p className="text-sm">
                        {formatDateTime(reservation.startTime)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(
                          reservation.startTime,
                          reservation.endTime,
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <ReservationStatusBadge status={reservation.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ReservationRowActions
                        reservation={reservation}
                        actor={{ id: user.id, role: user.role }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationLinks
            page={result.page}
            pageCount={result.pageCount}
            buildHref={buildHref}
          />
        </>
      )}
    </div>
  );
}

function ReservationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-52 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
