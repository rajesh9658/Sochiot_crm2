import { body, query, param } from 'express-validator';

export const validateFollowupCreate = [
  body('customerId').isString().withMessage('Customer ID is required'),
  body('assignedTo').isString().withMessage('Assigned user is required'),
  body('followupDate').isISO8601().withMessage('Invalid follow-up date'),
  body('followupType')
    .isIn(['CALL', 'VISIT', 'MEETING', 'EMAIL'])
    .withMessage('Invalid follow-up type'),
  body('priority')
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Subject cannot exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
];

export const validateFollowupUpdate = [
  param('id').isString().withMessage('Invalid follow-up ID'),
  body('followupDate').optional().isISO8601().withMessage('Invalid follow-up date'),
  body('followupType')
    .optional()
    .isIn(['CALL', 'VISIT', 'MEETING', 'EMAIL'])
    .withMessage('Invalid follow-up type'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority'),
  body('assignedTo')
    .optional()
    .isString()
    .withMessage('Invalid assigned user')
];

export const validateFollowupComplete = [
  param('id').isString().withMessage('Invalid follow-up ID'),
  body('notes').optional().trim(),
  body('createActivity').optional().isBoolean(),
  body('activityData').optional().isObject()
];