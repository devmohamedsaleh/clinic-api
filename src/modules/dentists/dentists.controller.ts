import type { Request, Response } from 'express';
import {
  createDentistSchema,
  updateDentistSchema,
  listDentistQuerySchema,
  setDentistServicesSchema
} from './dentists.validation';
import { idParamSchema, statusBodySchema } from '../../utils/schemas';
import { validate } from '../../utils/validate';
import * as dentistsService from './dentists.service';

export async function create(req: Request, res: Response) {
  const input = validate(createDentistSchema, req.body);
  const dentist = await dentistsService.createDentist(input);
  res.status(201).json(dentist);
}

export async function list(req: Request, res: Response) {
  const query = validate(listDentistQuerySchema, req.query);
  const result = await dentistsService.listDentists(query);
  res.json(result);
}

export async function getById(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const dentist = await dentistsService.getDentistById(id);
  res.json(dentist);
}

export async function update(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updateDentistSchema, req.body);
  const dentist = await dentistsService.updateDentist(id, input);
  res.json(dentist);
}

export async function setStatus(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const { isActive } = validate(statusBodySchema, req.body);
  const dentist = await dentistsService.setDentistStatus(id, isActive);
  res.json(dentist);
}
export async function getServices(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  res.json(await dentistsService.getDentistServices(id));
}

export async function setServices(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const { serviceIds } = validate(setDentistServicesSchema, req.body);
  res.json(await dentistsService.setDentistServices(id, serviceIds));
}