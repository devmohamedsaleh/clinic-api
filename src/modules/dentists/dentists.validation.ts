import { z } from 'zod';
import { egyptianPhone } from '../../utils/schemas';

export const createDentistSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  specialty: z.string().trim().min(2, 'Specialty must be at least 2 characters').max(100).optional(),
  phone: egyptianPhone.optional(),
});

export const updateDentistSchema = createDentistSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const listDentistQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export const setDentistServicesSchema = z.object({
  serviceIds: z
    .array(z.number().int().positive())
    .max(100)
    .transform((ids) => [...new Set(ids)]),
});

export type CreateDentistInput = z.infer<typeof createDentistSchema>;
export type UpdateDentistInput = z.infer<typeof updateDentistSchema>;
export type ListDentistQuery = z.infer<typeof listDentistQuerySchema>;