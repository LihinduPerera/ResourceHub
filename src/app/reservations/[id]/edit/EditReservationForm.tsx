
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ResourceOption = {
  id: number;
  name: string;
  type: string;
  location: string;
  capacity: number;
};

type ReservationData = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  resourceId: number;
};

type Props = {
  reservation: ReservationData;
  resources: ResourceOption[];
};

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getMessage(result: unknown) {
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

export default function EditReservationForm({
  reservation,
  resources,
}: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(reservation.title);
  const [resourceId, setResourceId] = useState(
    String(reservation.resourceId),
  );
  const [startTime, setStartTime] = useState(
    toLocalInputValue(reservation.startTime),
  );
  const [endTime, setEndTime] = useState(
    toLocalInputValue(reservation.endTime),
  );

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      setError("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/reservations/${reservation.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceId: Number(resourceId),
            title,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
          }),
        },
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        setError(
          getMessage(result) ?? "Could not update the reservation.",
        );
        return;
      }

      router.push("/reservations");
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="edit-title" className="text-sm font-medium">
          Reservation title
        </label>
        <input
          id="edit-title"
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          minLength={3}
          maxLength={200}
          required
        />
      </div>

      <div>
        <label htmlFor="edit-resource" className="text-sm font-medium">
          Resource
        </label>
        <select
          id="edit-resource"
          className={inputClass}
          value={resourceId}
          onChange={(event) => setResourceId(event.target.value)}
          required
        >
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name} — {resource.location} (capacity {resource.capacity})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="edit-start" className="text-sm font-medium">
          Start time
        </label>
        <input
          id="edit-start"
          className={inputClass}
          type="datetime-local"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="edit-end" className="text-sm font-medium">
          End time
        </label>
        <input
          id="edit-end"
          className={inputClass}
          type="datetime-local"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          required
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {isSubmitting ? "Saving changes..." : "Save changes"}
      </button>
    </form>
  );
}
