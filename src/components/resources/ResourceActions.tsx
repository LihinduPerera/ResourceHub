"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiPatch, getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResourceFormDialog } from "./ResourceFormDialog";
import type { ResourceCardData } from "./ResourceCard";

export function ResourceActions({
  resource,
  isAdmin,
}: {
  resource: ResourceCardData;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      if (resource.isActive) {
        await apiDelete(`/api/resources/${resource.id}`);
        toast.success("Resource deactivated. It can no longer be booked.");
      } else {
        await apiPatch(`/api/resources/${resource.id}`, { isActive: true });
        toast.success("Resource reactivated and available to book.");
      }
      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update the resource."));
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            aria-label="Resource actions"
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            {resource.isActive ? <Power /> : <PowerOff />}
            {resource.isActive ? "Deactivate" : "Reactivate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ResourceFormDialog
        resource={resource}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resource.isActive
                ? `Deactivate “${resource.name}”?`
                : `Reactivate “${resource.name}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resource.isActive
                ? "The resource will disappear from booking options, but its reservation history is kept."
                : "The resource will immediately become available to book again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void toggleActive();
              }}
              disabled={busy}
            >
              {resource.isActive ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
