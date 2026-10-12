import { Suspense } from "react";
import type { Metadata } from "next";
import { LibraryBig, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listResources } from "@/lib/services/resource";
import {
  LIST_LIMITS,
  RESOURCE_TYPES,
  type ResourceType,
} from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResourceFilters } from "@/components/resources/ResourceFilters";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceFormDialog } from "@/components/resources/ResourceFormDialog";
import { PaginationLinks } from "@/components/shared/PaginationLinks";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Resources" };

type SearchParams = Record<string, string | string[] | undefined>;

export default function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div>
      <PageHeader
        title="Resources"
        description="Browse the spaces and equipment available to book."
      />
      <Suspense fallback={<ResourcesSkeleton />}>
        <ResourcesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ResourcesContent({
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
  const rawType = typeof params.type === "string" ? params.type : undefined;
  const type = RESOURCE_TYPES.includes(rawType as ResourceType)
    ? (rawType as ResourceType)
    : undefined;
  const showInactive = params.includeInactive === "true";

  const result = await listResources({
    page,
    pageSize: LIST_LIMITS.defaultPageSize,
    search,
    type,
    includeInactive: isAdmin && showInactive,
  });

  const filterParams = new URLSearchParams();
  if (search) filterParams.set("search", search);
  if (type) filterParams.set("type", type);
  if (isAdmin && showInactive) filterParams.set("includeInactive", "true");

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams(filterParams);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/resources?${query}` : "/resources";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={null}>
          <ResourceFilters isAdmin={isAdmin} />
        </Suspense>
        {isAdmin ? (
          <ResourceFormDialog
            trigger={
              <Button>
                <Plus />
                Add resource
              </Button>
            }
          />
        ) : null}
      </div>

      {result.total === 0 ? (
        <EmptyState
          icon={LibraryBig}
          title="No resources found"
          description="Try adjusting your search or filters, or check back later."
          action={
            isAdmin ? (
              <ResourceFormDialog
                trigger={<Button>Add the first resource</Button>}
              />
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {result.total} resource{result.total === 1 ? "" : "s"} found
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                isAdmin={isAdmin}
              />
            ))}
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

function ResourcesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-60 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
