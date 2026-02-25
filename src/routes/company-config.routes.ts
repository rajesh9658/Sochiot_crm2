import { Router } from 'express';
import { body } from 'express-validator';
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  getCompanySettings,
  updateCompanySettings,
  getTerritories,
  getDashboardStats
} from '../controllers/company-config.controller';
import { authenticate, requireCompanyAccess } from '../middleware/auth';

const router = Router();

// Validation rules
const categoryValidation = [
  body('name').notEmpty().trim(),
  body('description').optional().trim()
];

const companySettingsValidation = [
  body('name').optional().notEmpty().trim(),
  body('industry').optional().trim(),
  body('phone').optional().trim(),
  body('email').optional().isEmail(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('country').optional().trim()
];

// Protected routes
router.use(authenticate);
router.use(requireCompanyAccess);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Company settings
router.get('/settings', getCompanySettings);
router.put('/settings', companySettingsValidation, updateCompanySettings);

// Territories
router.get('/territories', getTerritories);

// Customer categories
router.get('/categories', getCategories);
router.post('/categories', categoryValidation, createCategory);
router.put('/categories/:id', categoryValidation, updateCategory);
router.delete('/categories/:id', deleteCategory);

export default router;