import { Router } from 'express';
import * as dentalVisitsController from './dental-visits.controller';

const router = Router();

router.post('/', dentalVisitsController.start);
router.get('/', dentalVisitsController.list);
router.get('/:id', dentalVisitsController.getById);
router.post('/:id/procedures', dentalVisitsController.recordProcedure);
router.patch('/:id/notes', dentalVisitsController.updateNotes);
router.post('/:id/complete', dentalVisitsController.complete);

export default router;
