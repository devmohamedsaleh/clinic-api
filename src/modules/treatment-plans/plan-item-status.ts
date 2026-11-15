import type { PlanItemStatus } from '../../../generated/prisma/client';

export const allowedTransitions: Record<PlanItemStatus, PlanItemStatus[]> = {
  PENDING: ['IN_PROGRESS', 'COMPLETED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

export function canTransition(from: PlanItemStatus, to: PlanItemStatus) {
  return allowedTransitions[from].includes(to);
}