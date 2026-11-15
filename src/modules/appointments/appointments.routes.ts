import { Router } from 'express';
import * as appointmentsController from './appointments.controller';

const router = Router();

router.post('/', appointmentsController.create);
router.get('/:id', appointmentsController.getById);
router.post('/', appointmentsController.create);
router.get('/', appointmentsController.list);
router.get('/:id', appointmentsController.getById);
router.patch('/:id', appointmentsController.update);
router.patch('/:id/status', appointmentsController.setStatus);

export default router;