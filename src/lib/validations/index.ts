import { z } from "zod";
import {
  RESERVATION_STATUSES,
  RESOURCE_TYPES,
  USER_ROLES,
} from "@/lib/constants";

export const resourceTypeSchema = z.enum(RESOURCE_TYPES);

export const createResourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(150),
  type: resourceTypeSchema,
  location: z
    .string()
    .trim()
    .min(2, "Location must be at least 2 characters.")
    .max(255),
  capacity: z.number().int().min(1, "Capacity must be at least 1.").max(1000),
  description: z.string().trim().max(1000).optional(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;

export const updateResourceSchema = createResourceSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields were provided to update.",
    path: ["_"],
  });

export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

export const listResourcesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(100).optional(),
  type: resourceTypeSchema.optional(),
  includeInactive: z.enum(["true", "false"]).optional(),
});

export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;

export const createReservationSchema = z.object({
  resourceId: z.string().trim().min(1).max(200),
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(200),
  notes: z.string().trim().max(1000).optional(),
  startTime: z.string().datetime({
    offset: true,
    message: "Start time must be a valid ISO datetime.",
  }),
  endTime: z.string().datetime({
    offset: true,
    message: "End time must be a valid ISO datetime.",
  }),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const updateReservationSchema = createReservationSchema
  .pick({
    title: true,
    notes: true,
    resourceId: true,
    startTime: true,
    endTime: true,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields were provided to update.",
    path: ["_"],
  });

export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;

export const reservationDecisionSchema = z
  .object({
    action: z.enum(["CONFIRM", "REJECT"]),
    rejectionReason: z
      .string()
      .trim()
      .max(500, "Rejection reason must be 500 characters or fewer.")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "REJECT" && !value.rejectionReason) {
      ctx.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "A rejection reason is required.",
      });
    }
  });

export type ReservationDecisionInput = z.infer<
  typeof reservationDecisionSchema
>;

export const listReservationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  status: z.enum(RESERVATION_STATUSES).optional(),
  resourceId: z.string().trim().min(1).max(200).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  search: z.string().trim().max(100).optional(),
});

export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128),
});
