import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../utils/app-error';
import {
  assertAppointmentCanStartVisit,
  assertTreatmentPlanItemCanBePerformed,
} from './dental-visits.rules';
import {
  recordProcedureSchema,
  startDentalVisitSchema,
  updateVisitNotesSchema,
} from './dental-visits.validation';
import type { PrismaClient } from '../../../generated/prisma/client';
import {
  completeDentalVisit,
  recordProcedure,
  startDentalVisit,
  updateDentalVisitNotes,
} from './dental-visits.service';

function fakePrisma(seed: Record<string, unknown> = {}) {
  const state = {
    appointments: (seed.appointments as any[]) ?? [],
    visits: (seed.visits as any[]) ?? [],
    procedures: (seed.procedures as any[]) ?? [],
    items: (seed.items as any[]) ?? [],
    failPlanCompletion: false,
    failAppointmentCompletion: false,
  };

  const tx = {
    appointment: {
      findUnique: async ({ where }: any) => state.appointments.find((row) => row.id === where.id) ?? null,
      updateMany: async ({ where, data }: any) => {
        if (state.failAppointmentCompletion) return { count: 0 };
        const row = state.appointments.find((entry) => entry.id === where.id && where.status.in.includes(entry.status));
        if (!row) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    dentalVisit: {
      create: async ({ data }: any) => {
        if (state.visits.some((row) => row.appointmentId === data.appointmentId)) throw { code: 'P2002' };
        const row = { id: state.visits.length + 1, status: 'ACTIVE', ...data };
        state.visits.push(row);
        return row;
      },
      findUnique: async ({ where }: any) => state.visits.find((row) => row.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }: any) => {
        const row = state.visits.find((entry) => entry.id === where.id);
        if (!row) throw new Error('missing');
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        const row = state.visits.find((entry) => entry.id === where.id && (!where.status || entry.status === where.status));
        if (!row) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    treatmentPlanItem: {
      findUnique: async ({ where }: any) => {
        const item = state.items.find((row) => row.id === where.id);
        return item ? { ...item, plan: { patientId: item.patientId } } : null;
      },
      updateMany: async ({ where, data }: any) => {
        if (state.failPlanCompletion) return { count: 0 };
        const item = state.items.find((row) => row.id === where.id && where.status.in.includes(row.status));
        if (!item) return { count: 0 };
        Object.assign(item, data);
        return { count: 1 };
      },
    },
    performedProcedure: {
      create: async ({ data }: any) => {
        if (data.treatmentPlanItemId !== undefined && state.procedures.some((row) => row.visitId === data.visitId && row.treatmentPlanItemId === data.treatmentPlanItemId)) throw { code: 'P2002' };
        const row = { id: state.procedures.length + 1, ...data };
        state.procedures.push(row);
        return row;
      },
    },
  };

  const client = {
    ...tx,
    $transaction: async (work: any) => {
      const snapshot = structuredClone(state);
      try {
        return await work(tx);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    },
  };
  return { client: client as unknown as PrismaClient, state };
}

function visitSeed(status = 'ACTIVE') {
  return { id: 1, appointmentId: 10, patientId: 20, dentistId: 30, status };
}

function planItemSeed(status = 'PENDING') {
  return { id: 40, patientId: 20, dentistId: 30, serviceId: 50, status };
}

test('scheduled and confirmed appointments can start a visit', () => {
  assert.doesNotThrow(() => assertAppointmentCanStartVisit('SCHEDULED'));
  assert.doesNotThrow(() => assertAppointmentCanStartVisit('CONFIRMED'));
});

test('cancelled and completed appointments cannot start a visit', () => {
  for (const status of ['CANCELLED', 'COMPLETED']) {
    assert.throws(() => assertAppointmentCanStartVisit(status), (error: unknown) =>
      error instanceof AppError && error.statusCode === 409,
    );
  }
});

test('treatment plan items can complete only from pending or in progress', () => {
  assert.doesNotThrow(() => assertTreatmentPlanItemCanBePerformed('PENDING'));
  assert.doesNotThrow(() => assertTreatmentPlanItemCanBePerformed('IN_PROGRESS'));
  assert.throws(
    () => assertTreatmentPlanItemCanBePerformed('COMPLETED'),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
});

test('visit request schemas validate required identifiers and notes', () => {
  assert.equal(startDentalVisitSchema.safeParse({ appointmentId: 1 }).success, true);
  assert.equal(startDentalVisitSchema.safeParse({ appointmentId: 0 }).success, false);
  assert.equal(recordProcedureSchema.safeParse({ serviceId: 2, treatmentPlanItemId: 3 }).success, true);
  assert.equal(updateVisitNotesSchema.safeParse({ notes: null }).success, true);
});

test('starting a visit links appointment patient and dentist', async () => {
  const { client, state } = fakePrisma({
    appointments: [{ id: 10, patientId: 20, dentistId: 30, status: 'CONFIRMED' }],
  });
  const visit = await startDentalVisit({ appointmentId: 10, notes: 'Initial notes' }, client);
  assert.equal((visit as any).appointmentId, 10);
  assert.equal((visit as any).patientId, 20);
  assert.equal((visit as any).dentistId, 30);
  assert.equal(state.visits.length, 1);
});

test('starting a visit rejects a missing appointment and a duplicate visit', async () => {
  const missing = fakePrisma();
  await assert.rejects(() => startDentalVisit({ appointmentId: 10 }, missing.client), /Appointment not found/);

  const duplicate = fakePrisma({
    appointments: [{ id: 10, patientId: 20, dentistId: 30, status: 'SCHEDULED' }],
    visits: [visitSeed()],
  });
  await assert.rejects(() => startDentalVisit({ appointmentId: 10 }, duplicate.client), /already exists/);
});

test('recording a procedure completes its treatment plan item once', async () => {
  const { client, state } = fakePrisma({ visits: [visitSeed()], items: [planItemSeed()] });
  await recordProcedure(1, { serviceId: 50, treatmentPlanItemId: 40 }, client);
  assert.equal(state.procedures.length, 1);
  assert.equal(state.items[0].status, 'COMPLETED');
  await assert.rejects(
    () => recordProcedure(1, { serviceId: 50, treatmentPlanItemId: 40 }, client),
    /already completed/,
  );
});

test('adding procedures to a completed visit is rejected', async () => {
  const { client } = fakePrisma({ visits: [visitSeed('COMPLETED')] });
  await assert.rejects(() => recordProcedure(1, { serviceId: 50 }, client), /completed visit/);
});

test('visit notes can be updated', async () => {
  const { client, state } = fakePrisma({ visits: [visitSeed()] });
  await updateDentalVisitNotes(1, 'Updated clinical note', client);
  assert.equal(state.visits[0].notes, 'Updated clinical note');
});

test('completing a visit completes its appointment and cannot be repeated', async () => {
  const { client, state } = fakePrisma({
    visits: [visitSeed()],
    appointments: [{ id: 10, status: 'CONFIRMED' }],
  });
  await completeDentalVisit(1, client);
  assert.equal(state.visits[0].status, 'COMPLETED');
  assert.equal(state.appointments[0].status, 'COMPLETED');
  await assert.rejects(() => completeDentalVisit(1, client), /already completed/);
});

test('failed related updates roll back the performed procedure', async () => {
  const { client, state } = fakePrisma({ visits: [visitSeed()], items: [planItemSeed()] });
  state.failPlanCompletion = true;
  await assert.rejects(
    () => recordProcedure(1, { serviceId: 50, treatmentPlanItemId: 40 }, client),
    /status changed/,
  );
  assert.equal(state.procedures.length, 0);
  assert.equal(state.items[0].status, 'PENDING');
});

test('failed appointment completion rolls back visit completion', async () => {
  const { client, state } = fakePrisma({
    visits: [visitSeed()],
    appointments: [{ id: 10, status: 'CONFIRMED' }],
  });
  state.failAppointmentCompletion = true;
  await assert.rejects(() => completeDentalVisit(1, client), /Appointment is not in a valid state/);
  assert.equal(state.visits[0].status, 'ACTIVE');
  assert.equal(state.appointments[0].status, 'CONFIRMED');
});
