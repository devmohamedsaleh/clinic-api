import prisma from '../../lib/prisma';
import type { Prisma } from '../../../generated/prisma/client';
import { AppError } from '../../utils/app-error';
import type { CreatePatientInput , UpdatePatientInput,ListPatientsQuery } from './patients.validation';
import { hasPrismaCode } from '../../utils/prisma-errors';

export async function createPatient(input: CreatePatientInput) {
  const existing = await prisma.patient.findFirst({
    where: {
      OR: [{ fileNumber: input.fileNumber }, { phone: input.phone }],
    },
    select: { fileNumber: true, phone: true },
  });

  if (existing) {
    const field =
      existing.fileNumber === input.fileNumber ? 'File number' : 'Phone';
    throw new AppError(409, `${field} already exists`);
  }

  try {
    return await prisma.patient.create({ data: input });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      throw new AppError(409, 'File number or phone already exists');
    }
    throw error;
  }
}
export async function getPatientById(id: number) {
  const patient = await prisma.patient.findUnique({ where: { id } });

  if (!patient) {
    throw new AppError(404, 'Patient not found');
  }

  return patient;
}

export async function listPatients(query: ListPatientsQuery) {
  const { search, page, limit, isActive } = query;

  const where: Prisma.PatientWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [data, total] = await prisma.$transaction([
    prisma.patient.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updatePatient(id: number, input: UpdatePatientInput) {
  const uniqueFieldChecks = [
    ...(input.fileNumber !== undefined
      ? [{ fileNumber: input.fileNumber }]
      : []),
    ...(input.phone !== undefined ? [{ phone: input.phone }] : []),
  ];

  if (uniqueFieldChecks.length > 0) {
    const existing = await prisma.patient.findFirst({
      where: {
        id: { not: id },
        OR: uniqueFieldChecks,
      },
      select: { fileNumber: true, phone: true },
    });

    if (existing) {
      const field =
        input.fileNumber !== undefined &&
        existing.fileNumber === input.fileNumber
          ? 'File number'
          : 'Phone';

      throw new AppError(409, `${field} already exists`);
    }
  }

  try {
    return await prisma.patient.update({
      where: { id },
      data: input,
    });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      throw new AppError(409, 'File number or phone already exists');
    }

    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(404, 'Patient not found');
    }

    throw error;
  }
}

export async function deactivatePatient(id: number) {
  try {
    return await prisma.patient.update({ where: { id }, data :{isActive: false} });
  } catch (error) {
    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(404, 'Patient not found');
    }

    throw error;
  }
}