import { z } from 'zod';

export const createPatientSchema = z.object({
  fileNumber: z.string().trim().min(1, 'File number is required').max(20),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z
    .string()
    .trim()
    .regex(/^01[0125]\d{8}$/, 'Phone must be a valid Egyptian mobile number'),
  dateOfBirth: z.coerce
    .date()
    .refine((d) => d <= new Date(), 'Date of birth cannot be in the future')
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export const updatePatientSchema = createPatientSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

  export const listPatientsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;