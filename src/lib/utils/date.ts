import { APP_TIME_ZONE } from "@/lib/constants";

/**
 * Date formatting helpers.
 *
 * Displayed dates use the organisation timezone (`Asia/Colombo`), while
 * `<input type="datetime-local">` values use the viewer's local time because
 * the browser interprets those values in the local zone.
 */

export type DateInput = Date | string | number;

function toDate(value: DateInput): Date | null {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: DateInput,
  timeZone: string = APP_TIME_ZONE,
): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatTime(
  value: DateInput,
  timeZone: string = APP_TIME_ZONE,
): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTime(
  value: DateInput,
  timeZone: string = APP_TIME_ZONE,
): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDayLong(
  value: DateInput,
  timeZone: string = APP_TIME_ZONE,
): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** "2h 30m" style duration for a window. */
export function formatDuration(start: DateInput, end: DateInput): string {
  const from = toDate(start);
  const to = toDate(end);
  if (!from || !to) return "—";

  const minutes = Math.round((to.getTime() - from.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

/** Whether two windows fall on the same day in the given timezone. */
export function isSameLocalDay(
  a: DateInput,
  b: DateInput,
  timeZone: string = APP_TIME_ZONE,
): boolean {
  return formatDate(a, timeZone) === formatDate(b, timeZone);
}

/** Start (00:00) and end (next 00:00) of the local day containing `value`. */
export function getLocalDayBounds(
  value: DateInput,
  timeZone: string = APP_TIME_ZONE,
) {
  const date = toDate(value);
  if (!date) throw new Error("Invalid date passed to getLocalDayBounds.");

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const offsetMs = localOffsetForTimezone(date, timeZone);

  // Wall-clock midnight in the target timezone, expressed as an absolute time.
  const startMs =
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
    ) - offsetMs;

  const start = new Date(startMs);
  return { start, end: new Date(startMs + 24 * 60 * 60 * 1000) };
}

/**
 * The current offset (ms) between the given timezone and UTC at `date`, used to
 * convert a naive local "yyyy-MM-ddTHH:mm" string into an absolute time.
 */
export function localOffsetForTimezone(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return asUTC - date.getTime();
}

/**
 * Converts an ISO timestamp into a `yyyy-MM-ddTHH:mm` string in the viewer's
 * local timezone — the format expected by `<input type="datetime-local">`.
 */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Builds an ISO string from a native `datetime-local` value in the view timezone. */
export function fromLocalInputValue(value: string): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

/** Time-of-day greeting based on the hour in the given timezone. */
export function getGreeting(
  value: DateInput = new Date(),
  timeZone: string = APP_TIME_ZONE,
): string {
  const date = toDate(value);
  if (!date) return "Hello";
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
