import {
  CalendarClock,
  LayoutDashboard,
  LibraryBig,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.resources, label: "Resources", icon: LibraryBig },
  { href: ROUTES.reservations, label: "Reservations", icon: CalendarClock },
  { href: ROUTES.users, label: "Users", icon: Users, adminOnly: true },
];
