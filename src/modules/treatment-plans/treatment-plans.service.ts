import prisma from '../../lib/prisma';
import type { Prisma } from '../../../generated/prisma/client';
import { AppError } from '../../utils/app-error';
import { hasPrismaCode } from '../../utils/prisma-errors';
import { allowedTransitions, canTransition } from './plan-item-status';
import type { PlanItemStatus } from '../../../generated/prisma/client';
import type {
  CreatePlanInput,
  ListPlansQuery,
  UpdatePlanInput,
  AddItemInput,
  UpdateItemInput,
} from './treatment-plans.validation';

const itemInclude = {
  service: { select: { id: true, name: true } },
  dentist: { select: { id: true, name: true } },
} satisfies Prisma.TreatmentPlanItemInclude;

const planInclude = {
  patient: { select: { id: true, name: true, fileNumber: true } },
  items: { orderBy: { id: 'asc' }, include: itemInclude },
} satisfies Prisma.TreatmentPlanInclude;

function summarize(items: { status: string }[]) {
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.status === 'COMPLETED').length;

  return {
    totalItems,
    completedItems,
    remainingItems: totalItems - completedItems,
  };
}

function withSummary<T extends { items: { status: string }[] }>(plan: T) {
  return { ...plan, summary: summarize(plan.items) };
}

type ItemProblem = {
  itemIndex: number;
  field: 'serviceId' | 'dentistId';
  message: string;
  missing: boolean;
};

async function buildItems(items: CreatePlanInput['items']) {
  if (items.length === 0) {
    return [];
  }

  const serviceIds = [...new Set(items.map((item) => item.serviceId))];
  const dentistIds = [...new Set(items.map((item) => item.dentistId))];

  const [services, dentists, links] = await prisma.$transaction([
    prisma.dentalService.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, isActive: true, price: true },
    }),
    prisma.dentist.findMany({
      where: { id: { in: dentistIds } },
      select: { id: true, isActive: true },
    }),
    prisma.dentistService.findMany({
      where: { dentistId: { in: dentistIds }, serviceId: { in: serviceIds } },
      select: { dentistId: true, serviceId: true },
    }),
  ]);

  const serviceById = new Map(services.map((s) => [s.id, s] as const));
  const dentistById = new Map(dentists.map((d) => [d.id, d] as const));
  const offered = new Set(links.map((l) => `${l.dentistId}:${l.serviceId}`));

  const problems: ItemProblem[] = [];

  const data = items.flatMap((item, index) => {
    const service = serviceById.get(item.serviceId);
    const dentist = dentistById.get(item.dentistId);
    const problemsBefore = problems.length;

    if (!service) {
      problems.push({ itemIndex: index, field: 'serviceId', message: 'Service does not exist', missing: true });
    } else if (!service.isActive) {
      problems.push({ itemIndex: index, field: 'serviceId', message: 'Service is inactive', missing: false });
    }

    if (!dentist) {
      problems.push({ itemIndex: index, field: 'dentistId', message: 'Dentist does not exist', missing: true });
    } else if (!dentist.isActive) {
      problems.push({ itemIndex: index, field: 'dentistId', message: 'Dentist is inactive', missing: false });
    }

    if (service && dentist && !offered.has(`${dentist.id}:${service.id}`)) {
      problems.push({ itemIndex: index, field: 'dentistId', message: 'Dentist does not provide this service', missing: false });
    }

    if (!service || problems.length > problemsBefore) {
      return [];
    }

    return [
      {
        serviceId: item.serviceId,
        dentistId: item.dentistId,
        notes: item.notes,
        price: service.price,
      },
    ];
  });

  if (problems.length > 0) {
    throw new AppError(
      problems.some((problem) => problem.missing) ? 400 : 409,
      'Some plan items are invalid',
      problems.map(({ missing, ...rest }) => rest),
    );
  }

  return data;
}

export async function createPlan(input: CreatePlanInput) {
  const { patientId, title, notes, items } = input;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { isActive: true },
  });

  if (!patient) {
    throw new AppError(400, 'Patient does not exist');
  }
  if (!patient.isActive) {
    throw new AppError(409, 'Patient is inactive');
  }

  const itemsData = await buildItems(items);

  const plan = await prisma.treatmentPlan.create({
    data: { patientId, title, notes, items: { create: itemsData } },
    include: planInclude,
  });

  return withSummary(plan);
}

export async function getPlanById(id: number) {
  const plan = await prisma.treatmentPlan.findUnique({
    where: { id },
    include: planInclude,
  });

  if (!plan) {
    throw new AppError(404, 'Treatment plan not found');
  }

  return withSummary(plan);
}
export async function listPlans(query: ListPlansQuery) {
  const { patientId, hasRemaining, page, limit } = query;

  const where: Prisma.TreatmentPlanWhereInput = {};

  if (patientId !== undefined) {
    where.patientId = patientId;
  }

  if (hasRemaining === true) {
    where.items = { some: { status: { not: 'COMPLETED' } } };
  } else if (hasRemaining === false) {
    where.items = { none: { status: { not: 'COMPLETED' } } };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.treatmentPlan.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        patient: { select: { id: true, name: true, fileNumber: true } },
        items: { select: { status: true } },
      },
    }),
    prisma.treatmentPlan.count({ where }),
  ]);

  const data = rows.map(({ items, ...plan }) => ({
    ...plan,
    summary: summarize(items),
  }));

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function updatePlan(id: number, input: UpdatePlanInput) {
  try {
    const plan = await prisma.treatmentPlan.update({
      where: { id },
      data: input,
      include: planInclude,
    });

    return withSummary(plan);
  } catch (error) {
    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(404, 'Treatment plan not found');
    }
    throw error;
  }
}
async function getPlanSummary(planId: number) {
  const items = await prisma.treatmentPlanItem.findMany({
    where: { planId },
    select: { status: true },
  });

  return summarize(items);
}

async function findItem(planId: number, itemId: number) {
  const item = await prisma.treatmentPlanItem.findFirst({
    where: { id: itemId, planId },
  });

  if (!item) {
    throw new AppError(404, 'Plan item not found');
  }

  return item;
}

async function assertDentistCanPerform(dentistId: number, serviceId: number) {
  const dentist = await prisma.dentist.findUnique({
    where: { id: dentistId },
    select: {
      isActive: true,
      services: { where: { serviceId }, select: { serviceId: true } },
    },
  });

  if (!dentist) {
    throw new AppError(400, 'Dentist does not exist');
  }
  if (!dentist.isActive) {
    throw new AppError(409, 'Dentist is inactive');
  }
  if (dentist.services.length === 0) {
    throw new AppError(409, 'Dentist does not provide this service');
  }
}
export async function addItem(planId: number, input: AddItemInput) {
  const plan = await prisma.treatmentPlan.findUnique({
    where: { id: planId },
    select: { patient: { select: { isActive: true } } },
  });

  if (!plan) {
    throw new AppError(404, 'Treatment plan not found');
  }
  if (!plan.patient.isActive) {
    throw new AppError(409, 'Patient is inactive');
  }

  const [itemData] = await buildItems([input]);

  const item = await prisma.treatmentPlanItem.create({
    data: { ...itemData, planId },
    include: itemInclude,
  });

  return { item, summary: await getPlanSummary(planId) };
}
export async function updateItem(
  planId: number,
  itemId: number,
  input: UpdateItemInput,
) {
  const item = await findItem(planId, itemId);

  if (item.status === 'COMPLETED') {
    throw new AppError(409, 'Completed items cannot be edited');
  }

  if (input.dentistId !== undefined && input.dentistId !== item.dentistId) {
    await assertDentistCanPerform(input.dentistId, item.serviceId);
  }

  try {
    return await prisma.treatmentPlanItem.update({
      where: { id: itemId, status: { not: 'COMPLETED' } },
      data: input,
      include: itemInclude,
    });
  } catch (error) {
    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(409, 'Item was completed by another request');
    }
    throw error;
  }
}
export async function setItemStatus(
  planId: number,
  itemId: number,
  next: PlanItemStatus,
) {
  const item = await findItem(planId, itemId);

  if (!canTransition(item.status, next)) {
    throw new AppError(
      409,
      `Cannot change status from ${item.status} to ${next}`,
      { from: item.status, to: next, allowed: allowedTransitions[item.status] },
    );
  }

  try {
    const updated = await prisma.treatmentPlanItem.update({
      where: { id: itemId, status: item.status },
      data: { status: next },
      include: itemInclude,
    });

    return { item: updated, summary: await getPlanSummary(planId) };
  } catch (error) {
    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(409, 'Item status was changed by another request, reload and try again');
    }
    throw error;
  }
}
export async function deleteItem(planId: number, itemId: number) {
  const item = await findItem(planId, itemId);

  if (item.status !== 'PENDING') {
    throw new AppError(409, 'Only pending items can be deleted');
  }

  try {
    await prisma.treatmentPlanItem.delete({
      where: { id: itemId, status: 'PENDING' },
    });
  } catch (error) {
    if (hasPrismaCode(error, 'P2025')) {
      throw new AppError(409, 'Item status was changed by another request, reload and try again');
    }
    throw error;
  }

  return { summary: await getPlanSummary(planId) };
}