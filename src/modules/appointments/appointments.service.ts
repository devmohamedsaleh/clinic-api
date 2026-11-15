import prisma from '../../lib/prisma';
import type { AppointmentStatus, Prisma } from '../../../generated/prisma/client';
import { AppError } from '../../utils/app-error';
import { manualTransitions } from './appointment-status';
import { CLINIC_TIMEZONE } from '../../config/clinic';
import { dayRange } from '../../utils/dates';
import { hasPrismaCode, isExclusionViolation } from '../../utils/prisma-errors';
import type { CreateAppointmentInput , ListAppointmentsQuery, UpdateAppointmentInput} from './appointments.validation';

const MINUTE_MS = 60 * 1000;

const BUSY_STATUSES: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED'];

export const appointmentInclude = {
  patient: { select: { id: true, name: true, fileNumber: true, phone: true } },
  dentist: { select: { id: true, name: true } },
  service: { select: { id: true, name: true, durationMin: true } },
} satisfies Prisma.AppointmentInclude;

export async function assertDentistFree(
  dentistId: number,
  startAt: Date,
  endAt: Date,
  exceptId?: number,
) {
  const conflict = await prisma.appointment.findFirst({
    where: {
      dentistId,
      status: { in: BUSY_STATUSES },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(exceptId === undefined ? {} : { id: { not: exceptId } }),
    },
    select: { id: true, startAt: true, endAt: true },
  });

  if (conflict) {
    throw new AppError(409, 'Dentist is not available at this time', {
      conflictingAppointment: conflict,
    });
  }
}

type BookingProblem = {
  field: 'patientId' | 'dentistId' | 'serviceId';
  message: string;
  missing: boolean;
};

async function loadServiceForBooking(
  patientId: number,
  dentistId: number,
  serviceId: number,
) {
  const [patient, dentist, service] = await prisma.$transaction([
    prisma.patient.findUnique({
      where: { id: patientId },
      select: { isActive: true },
    }),
    prisma.dentist.findUnique({
      where: { id: dentistId },
      select: {
        isActive: true,
        services: { where: { serviceId }, select: { serviceId: true } },
      },
    }),
    prisma.dentalService.findUnique({
      where: { id: serviceId },
      select: { isActive: true, durationMin: true },
    }),
  ]);

  const problems: BookingProblem[] = [];

  if (!patient) {
    problems.push({ field: 'patientId', message: 'Patient does not exist', missing: true });
  } else if (!patient.isActive) {
    problems.push({ field: 'patientId', message: 'Patient is inactive', missing: false });
  }

  if (!dentist) {
    problems.push({ field: 'dentistId', message: 'Dentist does not exist', missing: true });
  } else if (!dentist.isActive) {
    problems.push({ field: 'dentistId', message: 'Dentist is inactive', missing: false });
  }

  if (!service) {
    problems.push({ field: 'serviceId', message: 'Service does not exist', missing: true });
  } else if (!service.isActive) {
    problems.push({ field: 'serviceId', message: 'Service is inactive', missing: false });
  }

  if (dentist && service && dentist.services.length === 0) {
    problems.push({
      field: 'dentistId',
      message: 'Dentist does not provide this service',
      missing: false,
    });
  }

  // `!service` always implies at least one problem; it is here so TypeScript knows `service` exists below
  if (problems.length > 0 || !service) {
    throw new AppError(
      problems.some((problem) => problem.missing) ? 400 : 409,
      'Appointment cannot be booked',
      problems.map(({ missing, ...rest }) => rest),
    );
  }

  return service;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const { patientId, dentistId, serviceId, startAt, notes } = input;

  if (startAt.getTime() <= Date.now()) {
    throw new AppError(400, 'Appointment must start in the future', [
      { field: 'startAt', message: 'Appointment must start in the future' },
    ]);
  }

  const service = await loadServiceForBooking(patientId, dentistId, serviceId);

  const durationMin = input.durationMin ?? service.durationMin;
  const endAt = new Date(startAt.getTime() + durationMin * MINUTE_MS);

  await assertDentistFree(dentistId, startAt, endAt);

  try {
    return await prisma.appointment.create({
      data: { patientId, dentistId, serviceId, startAt, endAt, notes },
      include: appointmentInclude,
    });
  } catch (error) {
    if (isExclusionViolation(error)) {
      throw new AppError(409, 'Dentist is not available at this time');
    }
    throw error;
  }
}

export async function getAppointmentById(id: number) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });

  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }

  return appointment;
}
export async function listAppointments(query: ListAppointmentsQuery) {
  const { date, dentistId, patientId, status, page, limit } = query;

  const where: Prisma.AppointmentWhereInput = {};
  let range: { from: Date; to: Date } | undefined;

  if (date) {
    range = dayRange(date, CLINIC_TIMEZONE);
    where.startAt = { gte: range.from, lt: range.to };
  }
  if (dentistId !== undefined) {
    where.dentistId = dentistId;
  }
  if (patientId !== undefined) {
    where.patientId = patientId;
  }
  if (status !== undefined) {
    where.status = status;
  }

  const [data, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where,
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: appointmentInclude,
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      ...(range
        ? { range: { from: range.from, to: range.to, timeZone: CLINIC_TIMEZONE } }
        : {}),
    },
  };
}

export async function updateAppointment(id: number, input: UpdateAppointmentInput) {
  const current = await getAppointmentById(id);

  if (!BUSY_STATUSES.includes(current.status)) {
    throw new AppError(409, `A ${current.status.toLowerCase()} appointment cannot be edited`);
  }

  if (input.startAt !== undefined && input.startAt.getTime() <= Date.now()) {
    throw new AppError(400, 'Appointment must start in the future', [
      { field: 'startAt', message: 'Appointment must start in the future' },
    ]);
  }

  const dentistId = input.dentistId ?? current.dentistId;
  const serviceId = input.serviceId ?? current.serviceId;
  const startAt = input.startAt ?? current.startAt;
  const entitiesChanged =
    dentistId !== current.dentistId || serviceId !== current.serviceId;
  const scheduleChanged =
    entitiesChanged || input.startAt !== undefined || input.durationMin !== undefined;

  let durationMin =
    input.durationMin ??
    Math.round((current.endAt.getTime() - current.startAt.getTime()) / MINUTE_MS);

  if (entitiesChanged) {
    const service = await loadServiceForBooking(current.patientId, dentistId, serviceId);

    if (input.durationMin === undefined && serviceId !== current.serviceId) {
      durationMin = service.durationMin;
    }
  }

  const endAt = new Date(startAt.getTime() + durationMin * MINUTE_MS);

  if (scheduleChanged) {
    await assertDentistFree(dentistId, startAt, endAt, id);
  }

  try {
    return await prisma.appointment.update({
      where: { id, status: { in: BUSY_STATUSES } },
      data: {
        ...(scheduleChanged ? { dentistId, serviceId, startAt, endAt } : {}),
        notes: input.notes,
      },
      include: appointmentInclude,
    });
  } catch (error) {
    if (isExclusionViolation(error)) {
      throw new AppError(409, 'Dentist is not available at this time');
    }
    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(409, 'Appointment was changed by another request, reload and try again');
    }
    throw error;
  }
}

export async function setAppointmentStatus(
  id: number,
  next: AppointmentStatus,
  cancelReason?: string,
) {
  const current = await prisma.appointment.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!current) {
    throw new AppError(404, 'Appointment not found');
  }

  if (!manualTransitions[current.status].includes(next)) {
    throw new AppError(409, `Cannot change status from ${current.status} to ${next}`, {
      from: current.status,
      to: next,
      allowed: manualTransitions[current.status],
    });
  }

  try {
    return await prisma.appointment.update({
      where: { id, status: current.status },
      data: {
        status: next,
        cancelReason: next === 'CANCELLED' ? cancelReason : undefined,
      },
      include: appointmentInclude,
    });
  } catch (error) {
    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(409, 'Appointment status was changed by another request, reload and try again');
    }
    throw error;
  }
}