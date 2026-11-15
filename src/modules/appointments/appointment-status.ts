import type { AppointmentStatus } from '../../../generated/prisma/client';

export const manualTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
};