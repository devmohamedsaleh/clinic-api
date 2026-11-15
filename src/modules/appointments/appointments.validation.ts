import { z } from 'zod';

const instant = z.iso
  .datetime({
    offset: true,
    error: 'Must be an ISO 8601 date-time with an offset, e.g. 2026-11-15T10:00:00+02:00',
  })
  .transform((value) => new Date(value));

export const createAppointmentSchema = z.object({
  patientId: z.number().int().positive(),
  dentistId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  startAt: instant,
  durationMin: z.number().int().min(5).max(480).optional(),
  notes: z.string().trim().max(500).optional(),
});
export const listAppointmentsQuerySchema = z.object({
  date: z.iso.date().optional(),
  dentistId: z.coerce.number().int().positive().optional(),
  patientId: z.coerce.number().int().positive().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const updateAppointmentSchema = z
  .object({
    startAt: instant,
    durationMin: z.number().int().min(5).max(480),
    dentistId: z.number().int().positive(),
    serviceId: z.number().int().positive(),
    notes: z.string().trim().max(500).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const setAppointmentStatusSchema = z
  .object({
    status: z.enum(['CONFIRMED', 'CANCELLED']),
    cancelReason: z.string().trim().min(2).max(300).optional(),
  })
  .refine((data) => data.status === 'CANCELLED' || data.cancelReason === undefined, {
    message: 'cancelReason is only allowed when cancelling',
    path: ['cancelReason'],
  });

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;