import { AppError } from '../../utils/app-error';

export function assertAppointmentCanStartVisit(status: string) {
  if (status !== 'SCHEDULED' && status !== 'CONFIRMED') {
    throw new AppError(409, 'Appointment is not in a valid state for a visit');
  }
}

export function assertTreatmentPlanItemCanBePerformed(status: string) {
  if (status === 'COMPLETED') {
    throw new AppError(409, 'Treatment plan item is already completed');
  }
  if (status !== 'PENDING' && status !== 'IN_PROGRESS') {
    throw new AppError(409, 'Treatment plan item cannot be completed from its current state');
  }
}
