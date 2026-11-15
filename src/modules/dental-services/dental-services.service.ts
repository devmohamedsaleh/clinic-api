import prisma from '../../lib/prisma';
import type { Prisma } from '../../../generated/prisma/client';
import { AppError } from '../../utils/app-error';
import { hasPrismaCode } from '../../utils/prisma-errors';
import type {
  CreateServiceInput,
  UpdateServiceInput,
  ListServiceQuery,
} from './dental-services.validation';

async function assertNameAvailable(name: string, exceptId?: number) {
  const existing = await prisma.dentalService.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(exceptId === undefined ? {} : { id: { not: exceptId } }),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(409, 'Service name already exists');
  }
}

export async function createService(input: CreateServiceInput) {
  await assertNameAvailable(input.name);

  try {
    return await prisma.dentalService.create({ data: input });
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) {
      throw new AppError(409, 'Service name already exists');
    }
    throw error;
  }
}

export async function getServiceById(id: number) {
  const service = await prisma.dentalService.findUnique({ where: { id } });

  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  return service;
}

export async function listServices(query: ListServiceQuery) {
  const { search, page, limit, isActive } = query;

  const where: Prisma.DentalServiceWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [data, total] = await prisma.$transaction([
    prisma.dentalService.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dentalService.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateService(id: number, input: UpdateServiceInput) {
  await getServiceById(id);

  if (input.name !== undefined) {
    await assertNameAvailable(input.name, id);
  }

  try {
    return await prisma.dentalService.update({ where: { id }, data: input });
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) {
      throw new AppError(409, 'Service name already exists');
    }
    throw error;
  }
}

export async function setServiceStatus(id: number, isActive: boolean) {
  try {
    return await prisma.dentalService.update({
      where: { id },
      data: { isActive },
    });
  } catch (error) {
    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(404, 'Service not found');
    }
    throw error;
  }
}
export async function getServiceDentists(serviceId: number) {
  const service = await prisma.dentalService.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      name: true,
      dentists: {
        select: { dentist: true },
        orderBy: { dentist: { name: 'asc' } },
      },
    },
  });

  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  return {
    id: service.id,
    name: service.name,
    dentists: service.dentists.map((link) => link.dentist),
  };
}