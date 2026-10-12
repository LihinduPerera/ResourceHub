"use client";

import { useRouter } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import type { UserRole } from "@/lib/constants";
import { ROUTES, USER_ROLE_META } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: UserRole;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu() {
  const router = useRouter();
  const { data, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex w-full items-center gap-2 px-2 py-1.5">
        <Skeleton className="h-8 w-8 rounded-full bg-sidebar-accent" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24 bg-sidebar-accent" />
          <Skeleton className="h-3 w-32 bg-sidebar-accent" />
        </div>
      </div>
    );
  }

  const user = data?.user as SessionUser | undefined;

  if (!user) {
    return (
      <a
        href={ROUTES.signIn}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent"
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </a>
    );
  }

  const role = user.role ?? "MEMBER";
  const roleMeta = USER_ROLE_META[role];

  async function handleSignOut() {
    await authClient.signOut();
    router.push(ROUTES.signIn);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <Avatar className="h-8 w-8 border border-sidebar-border">
            <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
            </span>
            <span className="block truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">
            {user.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <span
            className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${roleMeta.badge}`}
          >
            {roleMeta.label}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push(ROUTES.profile)}>
          <UserRound />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
