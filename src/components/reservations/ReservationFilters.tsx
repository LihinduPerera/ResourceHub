"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESERVATION_STATUSES, RESERVATION_STATUS_META } from "@/lib/constants";

export function ReservationFilters({
  isAdmin,
  showResourceFilter = false,
  resourceOptions = [],
}: {
  isAdmin: boolean;
  showResourceFilter?: boolean;
  resourceOptions?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [input, setInput] = useState(searchParams.get("search") ?? "");
  const status = searchParams.get("status") ?? "";
  const mine = searchParams.get("mine") === "true";
  const resourceId = searchParams.get("resourceId") ?? "";

  function push(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    params.delete("page");
    startTransition(() =>
      router.push(`${pathname}?${params.toString()}`, { scroll: false }),
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        push({ search: input.trim() || null });
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search reservations…"
          className="pl-9 sm:w-56"
        />
      </div>

      <Select
        value={status}
        onValueChange={(value) =>
          push({ status: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {RESERVATION_STATUSES.map((item) => (
            <SelectItem key={item} value={item}>
              {RESERVATION_STATUS_META[item].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showResourceFilter && resourceOptions.length > 0 ? (
        <Select
          value={resourceId}
          onValueChange={(value) =>
            push({ resourceId: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All resources</SelectItem>
            {resourceOptions.map((resource) => (
              <SelectItem key={resource.id} value={resource.id}>
                {resource.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {isAdmin ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={mine}
            onCheckedChange={(checked) =>
              push({ mine: checked ? "true" : null })
            }
          />
          Only mine
        </label>
      ) : null}

      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        Apply
      </Button>
    </form>
  );
}
