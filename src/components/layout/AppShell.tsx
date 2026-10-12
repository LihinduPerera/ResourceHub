"use client";

import { Suspense, type ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

/**
 * The application chrome. `AppSidebar` and `TopBar` read `usePathname()` to
 * highlight the active section, which is request-time data under Cache
 * Components — each is therefore isolated behind its own Suspense boundary so
 * the rest of the shell can still be prerendered.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarFallback />}>
        <AppSidebar />
      </Suspense>
      <SidebarInset>
        <Suspense fallback={<TopBarFallback />}>
          <TopBar />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SidebarFallback() {
  return (
    <div
      aria-hidden="true"
      className="hidden w-64 shrink-0 border-r bg-sidebar md:block"
    />
  );
}

function TopBarFallback() {
  return (
    <header
      aria-hidden="true"
      className="sticky top-0 z-10 h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    />
  );
}
