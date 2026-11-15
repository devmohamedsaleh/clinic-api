import { z } from 'zod';

const nullableNotes = z.string().trim().max(5000).nullable();

export const startDentalVisitSchema = z.object({
  appointmentId: z.number().int().positive(),
  notes: z.string().trim().max(5000).optional(),
});

export const recordProcedureSchema = z.object({
  serviceId: z.number().int().positive(),
  treatmentPlanItemId: z.number().int().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateVisitNotesSchema = z.object({
  notes: nullableNotes,
});

export const listDentalVisitsQuerySchema = z.object({
  patientId: z.coerce.number().int().positive().optional(),
  dentistId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type StartDentalVisitInput = z.infer<typeof startDentalVisitSchema>;
export type RecordProcedureInput = z.infer<typeof recordProcedureSchema>;
export type ListDentalVisitsQuery = z.infer<typeof listDentalVisitsQuerySchema>;
