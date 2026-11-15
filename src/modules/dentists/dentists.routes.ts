import { Router } from 'express';
import * as dentistsController from './dentists.controller';

const router = Router();

router.post('/', dentistsController.create);
router.get('/', dentistsController.list);
router.get('/:id', dentistsController.getById);
router.patch('/:id', dentistsController.update);
router.patch('/:id/status', dentistsController.setStatus);
router.get('/:id/services', dentistsController.getServices);
router.put('/:id/services', dentistsController.setServices);

export default router;