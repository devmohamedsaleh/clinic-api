import type { Request, Response } from 'express';
import {
  createServiceSchema,
  updateServiceSchema,
  listServiceQuerySchema,
} from './dental-services.validation';
import { idParamSchema, statusBodySchema } from '../../utils/schemas';
import { validate } from '../../utils/validate';
import * as servicesService from './dental-services.service';

export async function create(req: Request, res: Response) {
  const input = validate(createServiceSchema, req.body);
  const service = await servicesService.createService(input);
  res.status(201).json(service);
}

export async function list(req: Request, res: Response) {
  const query = validate(listServiceQuerySchema, req.query);
  res.json(await servicesService.listServices(query));
}

export async function getById(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  res.json(await servicesService.getServiceById(id));
}

export async function update(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updateServiceSchema, req.body);
  res.json(await servicesService.updateService(id, input));
}

export async function setStatus(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const { isActive } = validate(statusBodySchema, req.body);
  res.json(await servicesService.setServiceStatus(id, isActive));
}
export async function getDentists(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  res.json(await servicesService.getServiceDentists(id));
}