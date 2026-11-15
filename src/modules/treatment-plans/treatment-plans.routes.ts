import { Router } from 'express';
import * as plansController from './treatment-plans.controller';

const router = Router();

router.post('/', plansController.create);
router.get('/:id', plansController.getById);
router.post('/', plansController.create);
router.get('/', plansController.list);
router.get('/:id', plansController.getById);
router.patch('/:id', plansController.update);
router.post('/:id/items', plansController.addItem);
router.patch('/:id/items/:itemId', plansController.updateItem);
router.patch('/:id/items/:itemId/status', plansController.setItemStatus);
router.delete('/:id/items/:itemId', plansController.deleteItem);

export default router;