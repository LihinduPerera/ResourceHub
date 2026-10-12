
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ResourceForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState("Meeting Room");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("10");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          location,
          capacity: Number(capacity),
        }),
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : typeof result === "object" &&
                result !== null &&
                "error" in result &&
                typeof result.error === "string"
              ? result.error
              : "Could not create the resource. Check your input.";

        setError(message);
        return;
      }

      setName("");
      setType("Meeting Room");
      setLocation("");
      setCapacity("10");

      setSuccess("Resource created successfully.");

      // Refresh the Server Component so it reads the latest database data.
      router.refresh();
    } catch {
      setError(
        "Unable to connect to the server. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="resource-name"
          className="mb-2 block text-sm font-medium"
        >
          Resource name
        </label>

        <input
          id="resource-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Conference Room C"
          minLength={2}
          maxLength={150}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div>
        <label
          htmlFor="resource-type"
          className="mb-2 block text-sm font-medium"
        >
          Resource type
        </label>

        <select
          id="resource-type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        >
          <option>Meeting Room</option>
          <option>Conference Room</option>
          <option>Presentation Room</option>
          <option>Training Room</option>
          <option>Workspace</option>
          <option>Equipment</option>
          <option>Other</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="resource-location"
          className="mb-2 block text-sm font-medium"
        >
          Location
        </label>

        <input
          id="resource-location"
          name="location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="e.g. Floor 2"
          minLength={2}
          maxLength={255}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div>
        <label
          htmlFor="resource-capacity"
          className="mb-2 block text-sm font-medium"
        >
          Capacity
        </label>

        <input
          id="resource-capacity"
          name="capacity"
          type="number"
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          min={1}
          max={10000}
          step={1}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />

        <p className="mt-2 text-xs text-slate-500">
          Maximum number of people this resource can accommodate.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating resource..." : "Create resource"}
      </button>
    </form>
  );
}
