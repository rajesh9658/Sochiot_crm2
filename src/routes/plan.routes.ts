import { Router } from 'express';
import { body } from 'express-validator';
import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan
} from '../controllers/plan.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

const planValidation = [
  body('name').notEmpty(),
  body('maxUsers').isInt({ min: 1 }),
  body('maxStorage').isInt({ min: 1 }),
  body('priceMonthly').isDecimal(),
  body('priceYearly').isDecimal()
];

// All plan routes require authentication
router.use(authenticate);

// Public routes (authenticated users)
router.get('/', getPlans);
router.get('/:id', getPlanById);

// Super admin only routes
router.post('/', requireSuperAdmin, planValidation, createPlan);
router.put('/:id', requireSuperAdmin, updatePlan);
router.delete('/:id', requireSuperAdmin, deletePlan);

export default router;