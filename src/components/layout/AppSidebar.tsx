"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/lib/constants";
import { useSession } from "@/lib/auth-client";
import { Brand } from "./Brand";
import { UserMenu } from "./UserMenu";
import { NAV_ITEMS } from "./nav-items";

export function AppSidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user as { role?: UserRole } | undefined)?.role;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === "ADMIN",
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
