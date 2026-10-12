"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NAV_ITEMS } from "./nav-items";

export function TopBar() {
  const pathname = usePathname();

  const current = NAV_ITEMS.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm font-semibold text-foreground">
        {current?.label ?? "Dashboard"}
      </span>
    </header>
  );
}
