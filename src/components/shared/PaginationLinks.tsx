import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function pageWindow(page: number, pageCount: number): number[] {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function PaginationLinks({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  const pages = pageWindow(page, pageCount);

  return (
    <nav
      className="flex items-center justify-center gap-1 pt-2"
      aria-label="Pagination"
    >
      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
      >
        <Link href={buildHref(page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Link>
      </Button>

      {pages[0] > 1 ? (
        <>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={buildHref(1)}>1</Link>
          </Button>
          {pages[0] > 2 ? (
            <span className="px-1 text-muted-foreground">…</span>
          ) : null}
        </>
      ) : null}

      {pages.map((p) => (
        <Button
          key={p}
          asChild
          variant={p === page ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
        >
          <Link
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Link>
        </Button>
      ))}

      {pages[pages.length - 1] < pageCount ? (
        <>
          {pages[pages.length - 1] < pageCount - 1 ? (
            <span className="px-1 text-muted-foreground">…</span>
          ) : null}
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={buildHref(pageCount)}>{pageCount}</Link>
          </Button>
        </>
      ) : null}

      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= pageCount}
      >
        <Link href={buildHref(page + 1)} aria-label="Next page">
          <ChevronRight />
        </Link>
      </Button>
    </nav>
  );
}
