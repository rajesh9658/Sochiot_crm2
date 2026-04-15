import { Router } from 'express';
import { body } from 'express-validator';
import {
  createFollowup,
  getFollowups,
  getFollowupById,
  updateFollowup,
  completeFollowup,
  cancelFollowup,
  getFollowupStats
} from '../controllers/followup.controller';
import { authenticate, requireCompanyAccess } from '../middleware/auth';

const router = Router();

const followupValidation = [
  body('customerId').isString().notEmpty(),
  body('assignedTo').isString().notEmpty(),
  body('followupDate').isISO8601(),
  body('followupType').isIn(['CALL', 'VISIT', 'MEETING', 'EMAIL']),
  body('priority').isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('subject').optional().trim(),
  body('description').optional().trim()
];

const completeValidation = [
  body('notes').optional().trim(),
  body('createActivity').optional().isBoolean(),
  body('activityData').optional().isObject()
];

router.use(authenticate);
router.use(requireCompanyAccess);

router.get('/stats', getFollowupStats);
router.post('/', followupValidation, createFollowup);
router.get('/', getFollowups);
router.get('/:id', getFollowupById);
router.put('/:id', updateFollowup);
router.post('/:id/complete', completeValidation, completeFollowup);
router.post('/:id/cancel', cancelFollowup);

export default router;