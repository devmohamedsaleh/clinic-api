import { Router } from 'express';
import * as patientsController from './patients.controller';

const router = Router();

router.post('/', patientsController.create);
router.get('/', patientsController.patientList);
router.get('/:id', patientsController.getById);
router.patch('/:id', patientsController.update);
router.patch('/:id/deactivate', patientsController.deactivate);

export default router;