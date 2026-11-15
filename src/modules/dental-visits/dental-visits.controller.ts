import type { Request, Response } from 'express';
import { idParamSchema } from '../../utils/schemas';
import { validate } from '../../utils/validate';
import * as dentalVisitsService from './dental-visits.service';
import {
  listDentalVisitsQuerySchema,
  recordProcedureSchema,
  startDentalVisitSchema,
  updateVisitNotesSchema,
} from './dental-visits.validation';

export async function start(req: Request, res: Response) {
  const input = validate(startDentalVisitSchema, req.body);
  const visit = await dentalVisitsService.startDentalVisit(input);
  res.status(201).json(visit);
}

export async function list(req: Request, res: Response) {
  const query = validate(listDentalVisitsQuerySchema, req.query);
  res.json(await dentalVisitsService.listDentalVisits(query));
}

export async function getById(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  res.json(await dentalVisitsService.getDentalVisitById(id));
}

export async function recordProcedure(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(recordProcedureSchema, req.body);
  res.status(201).json(await dentalVisitsService.recordProcedure(id, input));
}

export async function updateNotes(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const { notes } = validate(updateVisitNotesSchema, req.body);
  res.json(await dentalVisitsService.updateDentalVisitNotes(id, notes));
}

export async function complete(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  res.json(await dentalVisitsService.completeDentalVisit(id));
}
