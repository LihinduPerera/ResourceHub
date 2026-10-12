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
import { RESOURCE_TYPES, RESOURCE_TYPE_META } from "@/lib/constants";

export function ResourceFilters({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [input, setInput] = useState(searchParams.get("search") ?? "");
  const type = searchParams.get("type") ?? "";
  const includeInactive = searchParams.get("includeInactive") === "true";

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
          placeholder="Search resources…"
          className="pl-9 sm:w-60"
        />
      </div>

      <Select
        value={type}
        onValueChange={(value) =>
          push({ type: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {RESOURCE_TYPES.map((resourceType) => (
            <SelectItem key={resourceType} value={resourceType}>
              {RESOURCE_TYPE_META[resourceType].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isAdmin ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={includeInactive}
            onCheckedChange={(checked) =>
              push({ includeInactive: checked ? "true" : null })
            }
          />
          Show inactive
        </label>
      ) : null}

      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        Apply
      </Button>
    </form>
  );
}
