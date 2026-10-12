import type {
  ReservationStatus,
  ResourceType,
  UserRole,
} from "@/lib/constants";

/**
 * Serialisable DTO shapes used by the API and client components.
 * Dates are ISO strings once they cross the HTTP boundary.
 */

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type ResourceSummary = {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  capacity: number;
};

export type ResourceDTO = ResourceSummary & {
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReservationDTO = {
  id: string;
  title: string;
  notes: string | null;
  status: ReservationStatus;
  rejectionReason: string | null;
  startTime: string;
  endTime: string;
  decidedAt: string | null;
  decidedById: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
  resource: ResourceSummary;
};

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  createdAt: string;
};

export type ReservedWindow = {
  startTime: string;
  endTime: string;
};

export type AvailabilityDTO = {
  available: boolean;
  requested: ReservedWindow;
  conflicts: ReservedWindow[];
  suggestions: string[];
};

export type PagedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
