import { z } from 'zod';

export const planItemSchema = z.object({
  serviceId: z.number().int().positive(),
  dentistId: z.number().int().positive(),
  notes: z.string().trim().max(500).optional(),
});

export const createPlanSchema = z.object({
  patientId: z.number().int().positive(),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(planItemSchema).max(50).default([]),
});
export const listPlansQuerySchema = z.object({
  patientId: z.coerce.number().int().positive().optional(),
  hasRemaining: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const updatePlanSchema = z
  .object({
    title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150),
    notes: z.string().trim().max(1000).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
  export const itemParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
});

export const addItemSchema = planItemSchema;

export const updateItemSchema = z
  .object({
    dentistId: z.number().int().positive(),
    notes: z.string().trim().max(500).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const setItemStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;