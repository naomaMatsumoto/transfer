import { z } from "zod";

export const createReservationSchema = z.object({
  userId: z.number().int().positive("有効な会員IDを指定してください"),
  eventId: z.number().int().positive("有効なイベントIDを指定してください"),
  reservationType: z.enum(["normal", "makeup"]),
  makeupCreditId: z.number().int().positive().nullable().optional(),
});
