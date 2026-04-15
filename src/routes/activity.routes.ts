import { Router } from 'express';
import { body } from 'express-validator';
import {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  addActivityNote,
  getActivityStats
} from '../controllers/activity.controller';
import { authenticate, requireCompanyAccess } from '../middleware/auth';
import { validateLocation } from '../middleware/locationValidator';

const router = Router();

const activityValidation = [
  body('userId').isString().notEmpty(),
  body('customerId').isString().notEmpty(),
  body('activityType').isIn(['CALL', 'VISIT', 'MEETING', 'EMAIL', 'WHATSAPP']),
  body('activityDate').isISO8601(),
  body('durationMinutes').optional().isInt({ min: 1 }),
  body('purpose').optional().trim(),
  body('outcome').optional().isIn(['SUCCESSFUL', 'NO_RESPONSE', 'CALLBACK', 'NOT_INTERESTED', 'CONVERTED', 'PENDING']),
  body('nextFollowupDate').optional().isISO8601(),
  body('notes').optional().isArray(),
  body('notes.*.note').notEmpty(),
  body('notes.*.isInternal').optional().isBoolean()
];

const activityNoteValidation = [
  body('note').notEmpty().trim(),
  body('isInternal').optional().isBoolean()
];

router.use(authenticate);
router.use(requireCompanyAccess);

router.get('/stats', getActivityStats);
router.post('/', validateLocation, activityValidation, createActivity);
router.get('/', getActivities);
router.get('/:id', getActivityById);
router.put('/:id', validateLocation, updateActivity);
router.delete('/:id', deleteActivity);
router.post('/:id/notes', activityNoteValidation, addActivityNote);

export default router;