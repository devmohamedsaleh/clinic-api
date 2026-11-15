import type { Request , Response } from "express";
 import { AppError } from "../../utils/app-error";
import {
  createPatientSchema,
  updatePatientSchema,
  listPatientsQuerySchema
} from './patients.validation';
import { validate } from '../../utils/validate';
import * as patientsService from './patients.service';
import { idParamSchema} from '../../utils/schemas';


export async function create (req: Request , res: Response){
    const input  = validate(createPatientSchema, req.body);
  const patient = await patientsService.createPatient(input );
  res.status(201).json(patient);
}

export async function getById(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const patient = await patientsService.getPatientById(id);
  res.json(patient);
}

export async function patientList (req: Request, res: Response){
     const query = validate(listPatientsQuerySchema, req.query);
  const result = await patientsService.listPatients(query);
  res.json(result);
}
export async function update(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updatePatientSchema, req.body);
  const patient = await patientsService.updatePatient(id, input);
  res.json(patient);
}
export async function deactivate(req: Request, res: Response) {
  const { id } = validate(idParamSchema, req.params);
  const patient = await patientsService.deactivatePatient(id);
  res.json(patient);
}