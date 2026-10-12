import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {children}
      <Toaster position="top-center" richColors />
    </AppShell>
  );
}
