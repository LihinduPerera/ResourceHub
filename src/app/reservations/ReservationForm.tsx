
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

type Props = {
  resources: ResourceOption[];
};

function getErrorMessage(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return "Could not create the reservation.";
  }

  if ("message" in result && typeof result.message === "string") {
    return result.message;
  }

  if ("error" in result && typeof result.error === "string") {
    return result.error;
  }

  return "Could not create the reservation. Check your input.";
}

export default function ReservationForm({ resources }: Props) {
  const router = useRouter();

  const [userId, setUserId] = useState("1");
  const [resourceId, setResourceId] = useState(
    resources[0] ? String(resources[0].id) : "",
  );
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      setError("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: Number(userId),
          resourceId: Number(resourceId),
          title,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(result));
        return;
      }

      setTitle("");
      setStartTime("");
      setEndTime("");
      setSuccess("Reservation created successfully.");

      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        No active resources are available. Create or activate a resource before
        making a reservation.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="reservation-title" className="text-sm font-medium">
          Reservation title
        </label>
        <input
          id="reservation-title"
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Weekly team meeting"
          minLength={3}
          maxLength={200}
          required
        />
      </div>

      <div>
        <label htmlFor="reservation-resource" className="text-sm font-medium">
          Resource
        </label>
        <select
          id="reservation-resource"
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
        <label htmlFor="reservation-user" className="text-sm font-medium">
          User ID
        </label>
        <input
          id="reservation-user"
          className={inputClass}
          type="number"
          min="1"
          step="1"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          For now, use an existing user ID in the database. Authentication and
          user selection are not implemented yet.
        </p>
      </div>

      <div>
        <label htmlFor="reservation-start" className="text-sm font-medium">
          Start time
        </label>
        <input
          id="reservation-start"
          className={inputClass}
          type="datetime-local"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="reservation-end" className="text-sm font-medium">
          End time
        </label>
        <input
          id="reservation-end"
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

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating reservation..." : "Create reservation"}
      </button>
    </form>
  );
}
