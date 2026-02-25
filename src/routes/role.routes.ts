import { Router } from 'express';
import { body } from 'express-validator';
import {
  getPermissions,
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  checkPermission,
  getUserPermissions
} from '../controllers/role.controller';
import { authenticate, requireCompanyAccess } from '../middleware/auth';

const router = Router();

// Validation rules
const createRoleValidation = [
  body('name').notEmpty().trim(),
  body('description').optional().trim(),
  body('permissionIds').isArray().notEmpty(),
  body('permissionIds.*').isInt()
];

const updateRoleValidation = [
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('permissionIds').optional().isArray(),
  body('permissionIds.*').optional().isInt()
];

// Protected routes
router.use(authenticate);
router.use(requireCompanyAccess);

// Permissions
router.get('/permissions', getPermissions);
router.get('/my-permissions', getUserPermissions);
router.get('/check', checkPermission);

// Roles
router.get('/', getRoles);
router.post('/', createRoleValidation, createRole);
router.get('/:id', getRoleById);
router.put('/:id', updateRoleValidation, updateRole);
router.delete('/:id', deleteRole);

export default router;