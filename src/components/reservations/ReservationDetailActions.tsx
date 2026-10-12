"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiPost, apiDelete, getErrorMessage } from "@/lib/api/client";
import type { ReservationStatus, UserRole } from "@/lib/constants";
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
import { Textarea } from "@/components/ui/textarea";
import { ReservationEditDialog } from "./ReservationEditDialog";

export function ReservationDetailActions({
  reservation,
  actor,
}: {
  reservation: {
    id: string;
    status: ReservationStatus;
    userId: string;
    resourceId: string;
    title: string;
    notes: string | null;
    startTime: string;
    endTime: string;
  };
  actor: { id: string; role: UserRole };
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = actor.role === "ADMIN";
  const isOwner = reservation.userId === actor.id;
  const isPending = reservation.status === "PENDING";
  const editable =
    (isOwner || isAdmin) &&
    (reservation.status === "PENDING" || reservation.status === "CONFIRMED");

  async function cancel() {
    setBusy(true);
    try {
      await apiDelete(`/api/reservations/${reservation.id}`);
      toast.success("Reservation cancelled.");
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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && isPending ? (
          <>
            <Button onClick={approve} disabled={busy}>
              <CheckCircle2 />
              Confirm
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setRejectOpen(true)}
              disabled={busy}
            >
              <XCircle />
              Reject…
            </Button>
          </>
        ) : null}

        {editable ? (
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setCancelOpen(true)}
              disabled={busy}
            >
              <Ban />
              Cancel
            </Button>
          </>
        ) : null}
      </div>

      <ReservationEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        reservation={reservation}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              The slot will be freed immediately and the reservation can no
              longer be edited.
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
            placeholder="e.g. The boardroom is reserved for an external event that day."
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
