import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/services/user";
import { LIST_LIMITS } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleSelect } from "@/components/users/RoleSelect";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Users" };

type SearchParams = Record<string, string | string[] | undefined>;

export default function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage accounts and control who can approve reservations."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <UsersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await getCurrentUser();
  if (!actor) return null;
  if (actor.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const search =
    typeof params.search === "string" && params.search.trim()
      ? params.search.trim()
      : undefined;

  const result = await listUsers({
    page,
    pageSize: LIST_LIMITS.defaultPageSize,
    search,
  });

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        {result.total} user{result.total === 1 ? "" : "s"} found
      </p>
      {result.total === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No users found"
          description="Try a different search term."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Member since</TableHead>
                <TableHead className="text-right">Set role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((user) => {
                const isSelf = user.id === actor.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {user.name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase())
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {user.name}
                            {isSelf ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (you)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={USER_ROLE_BADGE[user.role]}
                      >
                        {user.role === "ADMIN" ? "Admin" : "Member"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RoleSelect
                        userId={user.id}
                        role={user.role}
                        disabled={isSelf}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Small inline badge styles (kept near usage for readability).
const USER_ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-indigo-100 text-indigo-800 border-indigo-200",
  MEMBER: "bg-slate-100 text-slate-700 border-slate-200",
};
