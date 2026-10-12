/**
 * Application-wide constants.
 *
 * Kept free of server-only imports so it is safe to use from both Server
 * Components and Client Components (no Node APIs, no generated Prisma code).
 */

export const APP_NAME = "ResourceHub";
export const APP_TAGLINE = "Resource reservation management";
export const APP_DESCRIPTION =
  "A central place to manage shared resources, coordinate reservations, and prevent scheduling conflicts.";

/** The organisation operates in Sri Lanka; dates are displayed in this zone. */
export const APP_TIME_ZONE = "Asia/Colombo";

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const ROUTES = {
  dashboard: "/",
  reservations: "/reservations",
  resources: "/resources",
  users: "/users",
  profile: "/profile",
  signIn: "/sign-in",
  signUp: "/sign-up",
} as const;

// ---------------------------------------------------------------------------
// Pagination / list limits
// ---------------------------------------------------------------------------

export const LIST_LIMITS = {
  defaultPageSize: 12,
  maxPageSize: 100,
  defaultTake: 60,
  maxTake: 100,
} as const;

// ---------------------------------------------------------------------------
// Domain enums
// ---------------------------------------------------------------------------

export const USER_ROLES = ["ADMIN", "MEMBER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RESOURCE_TYPES = [
  "MEETING_ROOM",
  "CONFERENCE_ROOM",
  "TRAINING_ROOM",
  "WORKSPACE",
  "EQUIPMENT",
  "VEHICLE",
  "OTHER",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Statuses that hold a slot and must never overlap on the same resource. */
export const ACTIVE_RESERVATION_STATUSES = ["PENDING", "CONFIRMED"] as const;

export const RESERVATION_STATUS_META: Record<
  ReservationStatus,
  { label: string; badge: string; dot: string; description: string }
> = {
  PENDING: {
    label: "Pending",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    description: "Awaiting review by an administrator.",
  },
  CONFIRMED: {
    label: "Confirmed",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    description: "Approved; the resource is held for this slot.",
  },
  REJECTED: {
    label: "Rejected",
    badge: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
    description: "Declined by an administrator.",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    description: "No longer requested; the slot is free.",
  },
};

export const RESOURCE_TYPE_META: Record<ResourceType, { label: string }> = {
  MEETING_ROOM: { label: "Meeting Room" },
  CONFERENCE_ROOM: { label: "Conference Room" },
  TRAINING_ROOM: { label: "Training Room" },
  WORKSPACE: { label: "Workspace" },
  EQUIPMENT: { label: "Equipment" },
  VEHICLE: { label: "Vehicle" },
  OTHER: { label: "Other" },
};

export const USER_ROLE_META: Record<
  UserRole,
  { label: string; badge: string }
> = {
  ADMIN: {
    label: "Admin",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  MEMBER: {
    label: "Member",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

// ---------------------------------------------------------------------------
// Booking rules
// ---------------------------------------------------------------------------

export const BOOKING_RULES = {
  /** Minimum reservation length in minutes. */
  minDurationMinutes: 15,
  /** Maximum reservation length in minutes (8 hours). */
  maxDurationMinutes: 8 * 60,
  /** How far ahead a reservation may be made. */
  maxDaysInAdvance: 365,
  /** Small grace applied when checking "must start in the future". */
  futureGraceSeconds: 60,
} as const;

export const BOOKING_RULE_MESSAGES = {
  endAfterStart: "End time must be after the start time.",
  startInPast: "Start time must be in the future.",
  tooShort: `Bookings must be at least ${BOOKING_RULES.minDurationMinutes} minutes long.`,
  tooLong: `Bookings cannot exceed ${BOOKING_RULES.maxDurationMinutes / 60} hours.`,
  tooFarAhead: `Bookings cannot be made more than ${BOOKING_RULES.maxDaysInAdvance} days in advance.`,
} as const;
