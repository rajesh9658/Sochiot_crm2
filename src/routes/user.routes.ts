import { Router } from 'express';
import { body } from 'express-validator';
import {
  inviteUser,
  acceptInvitation,
  getTeamMembers,
  getTeamHierarchy,
  updateUser,
  getUserDetails,
  getUserPerformance,
  bulkInviteUsers
} from '../controllers/user.controller';
import { authenticate, requireCompanyAccess } from '../middleware/auth';

const router = Router();

// Validation rules
const inviteUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('systemRole').isIn(['COMPANY_ADMIN', 'MANAGER', 'FIELD_SALES', 'SALES_EXECUTIVE']),
  body('managerId').optional().isString(),
  body('territory').optional().trim(),
  body('joiningDate').optional().isISO8601()
];

const acceptInvitationValidation = [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
];

const updateUserValidation = [
  body('systemRole').optional().isIn(['COMPANY_ADMIN', 'MANAGER', 'FIELD_SALES', 'SALES_EXECUTIVE']),
  body('managerId').optional({ nullable: true }).isString(),
  body('territory').optional().trim(),
  body('isActive').optional().isBoolean()
];

const bulkInviteValidation = [
  body('users').isArray().notEmpty(),
  body('users.*.email').isEmail(),
  body('users.*.firstName').notEmpty(),
  body('users.*.lastName').notEmpty(),
  body('users.*.systemRole').optional().isIn(['COMPANY_ADMIN', 'MANAGER', 'FIELD_SALES', 'SALES_EXECUTIVE'])
];

// Public route for accepting invitation
router.post('/accept-invitation', acceptInvitationValidation, acceptInvitation);

// Protected routes
router.use(authenticate);
router.use(requireCompanyAccess);

// Team management
router.get('/team', getTeamMembers);
router.get('/hierarchy', getTeamHierarchy);
router.post('/invite', inviteUserValidation, inviteUser);
router.post('/bulk-invite', bulkInviteValidation, bulkInviteUsers);
router.get('/:userId', getUserDetails);
router.put('/:userId', updateUserValidation, updateUser);
router.get('/:userId/performance', getUserPerformance);

export default router;
