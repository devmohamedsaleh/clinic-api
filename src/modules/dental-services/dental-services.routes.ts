import { Router } from 'express';
import * as servicesController from './dental-services.controller';

const router = Router();

router.post('/', servicesController.create);
router.get('/', servicesController.list);
router.get('/:id', servicesController.getById);
router.patch('/:id', servicesController.update);
router.patch('/:id/status', servicesController.setStatus);
router.get('/:id/dentists', servicesController.getDentists);

export default router;