import type { Request, Response } from 'express';
import {
  createPlanSchema,
  listPlansQuerySchema,
  updatePlanSchema,
  addItemSchema,
  itemParamsSchema,
  setItemStatusSchema,
  updateItemSchema,
} from './treatment-plans.validation';
import { idParamSchema } from '../../utils/schemas';
import { validate } from '../../utils/validate';
import * as plansService from './treatment-plans.service';

export async function create(req: Request, res: Response) {
  const input = validate(createPlanSchema, req.body);
  const plan = await plansService.createPlan(input);
  res.status(201).json(plan);
}

export async function getById(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  res.json(await plansService.getPlanById(id));
}
export async function list(req: Request, res: Response) {
  const query = validate(listPlansQuerySchema, req.query);
  res.json(await plansService.listPlans(query));
}

export async function update(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updatePlanSchema, req.body);
  res.json(await plansService.updatePlan(id, input));
}
export async function addItem(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(addItemSchema, req.body);
  res.status(201).json(await plansService.addItem(id, input));
}

export async function updateItem(req: Request, res: Response) {
  const { id, itemId } = validate(itemParamsSchema, req.params);
  const input = validate(updateItemSchema, req.body);
  res.json(await plansService.updateItem(id, itemId, input));
}

export async function setItemStatus(req: Request, res: Response) {
  const { id, itemId } = validate(itemParamsSchema, req.params);
  const { status } = validate(setItemStatusSchema, req.body);
  res.json(await plansService.setItemStatus(id, itemId, status));
}

export async function deleteItem(req: Request, res: Response) {
  const { id, itemId } = validate(itemParamsSchema, req.params);
  res.json(await plansService.deleteItem(id, itemId));
}