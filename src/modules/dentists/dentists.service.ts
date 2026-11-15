import prisma from '../../lib/prisma';
import type { Prisma } from '../../../generated/prisma/client';
import { AppError } from '../../utils/app-error';
import { hasPrismaCode } from '../../utils/prisma-errors';
import type {
  CreateDentistInput,
  UpdateDentistInput,
  ListDentistQuery,
} from './dentists.validation';

export async function createDentist(input: CreateDentistInput) {
  if (input.phone) {
    const existing = await prisma.dentist.findUnique({
      where: { phone: input.phone },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(409, 'Phone already exists');
    }
  }

  try {
    return await prisma.dentist.create({ data: input });
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) {
      throw new AppError(409, 'Phone already exists');
    }
    throw error;
  }
}

export async function getDentistById(id: number) {
  const dentist = await prisma.dentist.findUnique({ where: { id } });

  if (!dentist) {
    throw new AppError(404, 'Dentist not found');
  }

  return dentist;
}

export async function listDentists(query: ListDentistQuery) {
  const { search, page, limit, isActive } = query;

  const where: Prisma.DentistWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { specialty: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [data, total] = await prisma.$transaction([
    prisma.dentist.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dentist.count({ where }),
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

export async function updateDentist(id: number, input: UpdateDentistInput) {
  await getDentistById(id);

  if (input.phone) {
    const existing = await prisma.dentist.findFirst({
      where: { phone: input.phone, id: { not: id } },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(409, 'Phone already exists');
    }
  }

  try {
    return await prisma.dentist.update({ where: { id }, data: input });
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) {
      throw new AppError(409, 'Phone already exists');
    }
    throw error;
  }
}

export async function setDentistStatus(id: number, isActive: boolean) {
  try {
    return await prisma.dentist.update({ where: { id }, data: { isActive } });
  } catch (error) {
    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(404, 'Dentist not found');
    }
    throw error;
  }
}
export async function getDentistServices(dentistId: number) {
  const dentist = await prisma.dentist.findUnique({
    where: { id: dentistId },
    select: {
      id: true,
      name: true,
      services: {
        select: { service: true },
        orderBy: { service: { name: 'asc' } },
      },
    },
  });

  if (!dentist) {
    throw new AppError(404, 'Dentist not found');
  }

  return {
    id: dentist.id,
    name: dentist.name,
    services: dentist.services.map((link) => link.service),
  };
}

export async function setDentistServices(
  dentistId: number,
  serviceIds: number[],
) {
  await getDentistById(dentistId);

  const links = await prisma.dentistService.findMany({
    where: { dentistId },
    select: { serviceId: true },
  });

  const currentIds = new Set(links.map((link) => link.serviceId));
  const requestedIds = new Set(serviceIds);

  const toAdd = serviceIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !requestedIds.has(id));

  if (toAdd.length > 0) {
    const found = await prisma.dentalService.findMany({
      where: { id: { in: toAdd } },
      select: { id: true, isActive: true },
    });

    const foundIds = new Set(found.map((service) => service.id));
    const missing = toAdd.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new AppError(400, 'Some services do not exist', {
        missingServiceIds: missing,
      });
    }

    const inactive = found
      .filter((service) => !service.isActive)
      .map((service) => service.id);
    if (inactive.length > 0) {
      throw new AppError(409, 'Inactive services cannot be assigned', {
        inactiveServiceIds: inactive,
      });
    }
  }

  try {
    await prisma.$transaction([
      prisma.dentistService.deleteMany({
        where: { dentistId, serviceId: { in: toRemove } },
      }),
      prisma.dentistService.createMany({
        data: toAdd.map((serviceId) => ({ dentistId, serviceId })),
      }),
    ]);
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) {
      throw new AppError(409, 'Services were changed by another request, try again');
    }
    throw error;
  }

  return getDentistServices(dentistId);
}