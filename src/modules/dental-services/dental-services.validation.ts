import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(1_000_000, 'Price is too large')
    .multipleOf(0.01, 'Price can have at most 2 decimal places'),
  durationMin: z
    .number()
    .int('Duration must be a whole number of minutes')
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration cannot exceed 480 minutes'),
});

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const listServiceQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ListServiceQuery = z.infer<typeof listServiceQuerySchema>;