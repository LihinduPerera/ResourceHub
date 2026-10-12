
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  reservationId: number;
  status: string;
};

function getMessage(result: unknown): string | null {
  if (typeof result !== "object" || result === null) {
    return null;
  }

  if ("message" in result && typeof result.message === "string") {
    return result.message;
  }

  if ("error" in result && typeof result.error === "string") {
    return result.error;
  }

  return null;
}

export default function ReservationActions({
  reservationId,
  status,
}: Props) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState("");

  const isCancelled = status === "CANCELLED";

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this reservation?",
    );

    if (!confirmed) return;

    setError("");
    setIsCancelling(true);

    try {
      const response = await fetch(
        `/api/reservations/${reservationId}`,
        { method: "DELETE" },
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        setError(
          getMessage(result) ?? "Could not cancel this reservation.",
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      {!isCancelled && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/reservations/${reservationId}/edit`}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Edit
          </Link>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {isCancelling ? "Cancelling..." : "Cancel reservation"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {isCancelled && (
        <p className="text-sm text-slate-500">
          This reservation has been cancelled.
        </p>
      )}
    </div>
  );
}
