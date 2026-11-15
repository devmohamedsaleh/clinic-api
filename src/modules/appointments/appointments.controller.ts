import type { Request, Response } from 'express';
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  setAppointmentStatusSchema,
  updateAppointmentSchema,
} from './appointments.validation';
import { idParamSchema } from '../../utils/schemas';
import { validate } from '../../utils/validate';
import * as appointmentsService from './appointments.service';

export async function create(req: Request, res: Response) {
  const input = validate(createAppointmentSchema, req.body);
  const appointment = await appointmentsService.createAppointment(input);
  res.status(201).json(appointment);
}

export async function getById(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  res.json(await appointmentsService.getAppointmentById(id));
}
export async function list(req: Request, res: Response) {
  const query = validate(listAppointmentsQuerySchema, req.query);
  res.json(await appointmentsService.listAppointments(query));
}

export async function update(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updateAppointmentSchema, req.body);
  res.json(await appointmentsService.updateAppointment(id, input));
}

export async function setStatus(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const { status, cancelReason } = validate(setAppointmentStatusSchema, req.body);
  res.json(await appointmentsService.setAppointmentStatus(id, status, cancelReason));
}