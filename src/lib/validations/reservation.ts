
import { z } from "zod";

export const createReservationSchema = z
  .object({
    userId: z.number().int().positive(),
    resourceId: z.number().int().positive(),

    title: z.string().trim().min(3).max(200),

    startTime: z
      .string()
      .datetime({ offset: true }),

    endTime: z
      .string()
      .datetime({ offset: true }),
  })
  .refine(
    (reservation) =>
      new Date(reservation.endTime).getTime() >
      new Date(reservation.startTime).getTime(),
    {
      message: "End time must be after start time.",
      path: ["endTime"],
    },
  );

export type CreateReservationInput = z.infer<
  typeof createReservationSchema
>;
