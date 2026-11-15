import prisma from '../../lib/prisma';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client';
import { AppError } from '../../utils/app-error';
import { hasPrismaCode } from '../../utils/prisma-errors';
import {
  assertAppointmentCanStartVisit,
  assertTreatmentPlanItemCanBePerformed,
} from './dental-visits.rules';
import type {
  ListDentalVisitsQuery,
  RecordProcedureInput,
  StartDentalVisitInput,
} from './dental-visits.validation';

const visitDetails = {
  appointment: { include: { service: true } },
  patient: true,
  dentist: true,
  procedures: {
    include: { service: true, treatmentPlanItem: true },
    orderBy: { performedAt: 'asc' as const },
  },
};

export async function startDentalVisit(
  input: StartDentalVisitInput,
  client: PrismaClient = prisma,
) {
  try {
    return await client.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: input.appointmentId },
      });

      if (!appointment) {
        throw new AppError(404, 'Appointment not found');
      }
      assertAppointmentCanStartVisit(appointment.status);

      const stillBookable = await tx.appointment.updateMany({
        where: {
          id: appointment.id,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        data: { updatedAt: new Date() },
      });
      if (stillBookable.count !== 1) {
        throw new AppError(409, 'Appointment is not in a valid state for a visit');
      }

      return tx.dentalVisit.create({
        data: {
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          dentistId: appointment.dentistId,
          notes: input.notes,
        },
        include: visitDetails,
      });
    });
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) {
      throw new AppError(409, 'A visit already exists for this appointment');
    }
    throw error;
  }
}

export async function getDentalVisitById(id: number, client: PrismaClient = prisma) {
  const visit = await client.dentalVisit.findUnique({
    where: { id },
    include: visitDetails,
  });

  if (!visit) {
    throw new AppError(404, 'Dental visit not found');
  }

  return visit;
}

export async function listDentalVisits(
  query: ListDentalVisitsQuery,
  client: PrismaClient = prisma,
) {
  const { patientId, dentistId, status, page, limit } = query;
  const where: Prisma.DentalVisitWhereInput = {
    ...(patientId !== undefined ? { patientId } : {}),
    ...(dentistId !== undefined ? { dentistId } : {}),
    ...(status ? { status } : {}),
  };

  const [data, total] = await client.$transaction([
    client.dentalVisit.findMany({
      where,
      include: visitDetails,
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    client.dentalVisit.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function recordProcedure(
  visitId: number,
  input: RecordProcedureInput,
  client: PrismaClient = prisma,
) {
  try {
    return await client.$transaction(async (tx) => {
      // Lock the visit row and serialize this write with completion.
      const activeVisit = await tx.dentalVisit.updateMany({
        where: { id: visitId, status: 'ACTIVE' },
        data: { updatedAt: new Date() },
      });
      if (activeVisit.count !== 1) {
        const existingVisit = await tx.dentalVisit.findUnique({
          where: { id: visitId },
          select: { id: true },
        });
        if (!existingVisit) {
          throw new AppError(404, 'Dental visit not found');
        }
        throw new AppError(409, 'Procedures cannot be added to a completed visit');
      }

      const visit = await tx.dentalVisit.findUnique({
        where: { id: visitId },
        select: { id: true, patientId: true, dentistId: true, status: true },
      });

      if (!visit) throw new AppError(404, 'Dental visit not found');

      if (input.treatmentPlanItemId !== undefined) {
        const item = await tx.treatmentPlanItem.findUnique({
          where: { id: input.treatmentPlanItemId },
          include: { plan: { select: { patientId: true } } },
        });

        if (!item) {
          throw new AppError(404, 'Treatment plan item not found');
        }
        if (
          item.plan.patientId !== visit.patientId ||
          item.dentistId !== visit.dentistId ||
          item.serviceId !== input.serviceId
        ) {
          throw new AppError(
            400,
            'Treatment plan item must match the visit patient, dentist, and service',
          );
        }
        assertTreatmentPlanItemCanBePerformed(item.status);

        const procedure = await tx.performedProcedure.create({
          data: {
            visitId,
            serviceId: input.serviceId,
            treatmentPlanItemId: item.id,
            notes: input.notes,
          },
          include: { service: true, treatmentPlanItem: true },
        });

        const updated = await tx.treatmentPlanItem.updateMany({
          where: {
            id: item.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          data: { status: 'COMPLETED' },
        });
        if (updated.count !== 1) {
          throw new AppError(409, 'Treatment plan item status changed; reload and try again');
        }

        return procedure;
      }

      return tx.performedProcedure.create({
        data: {
          visitId,
          serviceId: input.serviceId,
          notes: input.notes,
        },
        include: { service: true, treatmentPlanItem: true },
      });
    });
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) {
      throw new AppError(409, 'This treatment plan item is already recorded for the visit');
    }
    if (hasPrismaCode(error, 'P2003')) {
      throw new AppError(400, 'Service or treatment plan item does not exist');
    }
    throw error;
  }
}

export async function updateDentalVisitNotes(
  id: number,
  notes: string | null,
  client: PrismaClient = prisma,
) {
  const result = await client.dentalVisit.updateMany({
    where: { id, status: 'ACTIVE' },
    data: { notes },
  });

  if (result.count === 0) {
    const visit = await client.dentalVisit.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!visit) {
      throw new AppError(404, 'Dental visit not found');
    }
    throw new AppError(409, 'Notes cannot be changed after the visit is completed');
  }

  return getDentalVisitById(id, client);
}

export async function completeDentalVisit(id: number, client: PrismaClient = prisma) {
  return client.$transaction(async (tx) => {
    const visit = await tx.dentalVisit.findUnique({
      where: { id },
      select: { id: true, appointmentId: true, status: true },
    });

    if (!visit) {
      throw new AppError(404, 'Dental visit not found');
    }
    if (visit.status !== 'ACTIVE') {
      throw new AppError(409, 'Dental visit is already completed');
    }

    const changed = await tx.dentalVisit.updateMany({
      where: { id, status: 'ACTIVE' },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    if (changed.count !== 1) {
      throw new AppError(409, 'Dental visit is already completed');
    }

    const appointment = await tx.appointment.updateMany({
      where: { id: visit.appointmentId, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
      data: { status: 'COMPLETED' },
    });
    if (appointment.count !== 1) {
      throw new AppError(409, 'Appointment is not in a valid state to complete this visit');
    }

    return tx.dentalVisit.findUniqueOrThrow({
      where: { id },
      include: visitDetails,
    });
  });
}
