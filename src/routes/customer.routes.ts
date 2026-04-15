import { Router } from 'express';
import { body, query, param } from 'express-validator';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  bulkAssignCustomers,
  getCustomerStats,
  exportCustomers,
  importCustomers,
  getCustomerTimeline
} from '../controllers/customer.controller';
import { authenticate, requireCompanyAccess, requirePermission } from '../middleware/auth';

const router = Router();

// Validation rules
const createCustomerValidation = [
  body('categoryId').isInt().toInt(),
  body('name').notEmpty().trim(),
  body('businessName').optional().trim(),
  body('phone').optional().matches(/^[0-9]{10}$/),
  body('email').optional().isEmail(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().matches(/^[0-9]{6}$/),
  body('leadStatus').optional().isIn(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONVERTED', 'LOST', 'ON_HOLD']),
  body('leadSource').optional().trim(),
  body('assignedTo').optional().isString(),
  body('gstNumber').optional().trim(),
  body('panNumber').optional().trim(),
  body('creditLimit').optional().isFloat().toFloat(),
  body('productInterests').optional().isArray()
];

const updateCustomerValidation = [
  body('categoryId').optional().isInt().toInt(),
  body('name').optional().trim(),
  body('businessName').optional().trim(),
  body('phone').optional().matches(/^[0-9]{10}$/),
  body('email').optional().isEmail(),
  body('leadStatus').optional().isIn(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONVERTED', 'LOST', 'ON_HOLD']),
  body('assignedTo').optional().isString(),
  body('isActive').optional().isBoolean()
];

const bulkAssignValidation = [
  body('customerIds').isArray().notEmpty(),
  body('customerIds.*').isString(),
  body('assignedTo').isString().notEmpty()
];

const importValidation = [
  body('customers').isArray().notEmpty(),
  body('customers.*.name').notEmpty()
];

// All routes require authentication and company access
router.use(authenticate);
router.use(requireCompanyAccess);

// Statistics and exports (before ID routes)
router.get('/stats', getCustomerStats);
router.get('/export', exportCustomers);
router.post('/import', importValidation, importCustomers);
router.post('/bulk-assign', bulkAssignValidation, bulkAssignCustomers);

// CRUD operations
router.post('/', createCustomerValidation, createCustomer);
router.get('/', getCustomers);
router.get('/:id', param('id').isString(), getCustomerById);
router.get('/:id/timeline', param('id').isString(), getCustomerTimeline);
router.put('/:id', updateCustomerValidation, updateCustomer);
router.delete('/:id', param('id').isString(), deleteCustomer);

export default router;