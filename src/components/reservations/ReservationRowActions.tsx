"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Ellipsis, Eye, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiPost, apiDelete, getErrorMessage } from "@/lib/api/client";
import type { UserRole, ReservationStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

export function ReservationRowActions({
  reservation,
  actor,
}: {
  reservation: { id: string; status: ReservationStatus; userId: string };
  actor: { id: string; role: UserRole };
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = actor.role === "ADMIN";
  const isOwner = reservation.userId === actor.id;
  const isPending = reservation.status === "PENDING";
  const canCancel =
    (isAdmin || isOwner) &&
    (reservation.status === "PENDING" || reservation.status === "CONFIRMED");

  async function cancel() {
    setBusy(true);
    try {
      await apiDelete(`/api/reservations/${reservation.id}`);
      toast.success("Reservation cancelled. The slot is now free.");
      setCancelOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to cancel the reservation."));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    try {
      await apiPost(`/api/reservations/${reservation.id}/decision`, {
        action: "CONFIRM",
      });
      toast.success("Reservation confirmed.");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to approve the reservation."));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      await apiPost(`/api/reservations/${reservation.id}/decision`, {
        action: "REJECT",
        rejectionReason: reason.trim() || null,
      });
      toast.success("Reservation rejected.");
      setRejectOpen(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to reject the reservation."));
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin && !canCancel) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href={`/reservations/${reservation.id}`}>
          <Eye />
          View
        </Link>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            aria-label="Reservation actions"
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/reservations/${reservation.id}`}>
              <Eye />
              View details
            </Link>
          </DropdownMenuItem>

          {isAdmin && isPending ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={approve}>
                <CheckCircle2 />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setRejectOpen(true)}
              >
                <XCircle />
                Reject…
              </DropdownMenuItem>
            </>
          ) : null}

          {canCancel ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setCancelOpen(true)}
              >
                <Ban />
                Cancel reservation
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              The slot will be freed and the reservation can no longer be
              edited. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void cancel();
              }}
              disabled={busy}
            >
              Cancel reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject reservation</DialogTitle>
            <DialogDescription>
              A reason is required so the requester understands the decision.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Equipment is under maintenance that day."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={reject}
              disabled={busy || !reason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
