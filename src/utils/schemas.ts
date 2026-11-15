import { z } from 'zod';

export const egyptianPhone = z
  .string()
  .trim()
  .regex(/^01[0125]\d{8}$/, 'Phone must be a valid Egyptian mobile number');

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const statusBodySchema = z.object({
  isActive: z.boolean(),
});