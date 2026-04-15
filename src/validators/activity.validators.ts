import { body, query, param } from 'express-validator';

export const validateActivityCreate = [
  body('userId').isString().withMessage('User ID is required'),
  body('customerId').isString().withMessage('Customer ID is required'),
  body('activityType')
    .isIn(['CALL', 'VISIT', 'MEETING', 'EMAIL', 'WHATSAPP'])
    .withMessage('Invalid activity type'),
  body('activityDate').isISO8601().withMessage('Invalid activity date'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be between 1 and 1440 minutes'),
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Purpose cannot exceed 255 characters'),
  body('outcome')
    .optional()
    .isIn(['SUCCESSFUL', 'NO_RESPONSE', 'CALLBACK', 'NOT_INTERESTED', 'CONVERTED', 'PENDING'])
    .withMessage('Invalid outcome'),
  body('locationLatitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('locationLongitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('nextFollowupDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid follow-up date'),
  body('notes')
    .optional()
    .isArray()
    .withMessage('Notes must be an array'),
  body('notes.*.note')
    .if(body('notes').exists())
    .notEmpty()
    .withMessage('Note text is required'),
  body('notes.*.isInternal')
    .optional()
    .isBoolean()
    .withMessage('isInternal must be boolean')
];

export const validateActivityUpdate = [
  param('id').isString().withMessage('Invalid activity ID'),
  body('activityDate').optional().isISO8601().withMessage('Invalid activity date'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be between 1 and 1440 minutes'),
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Purpose cannot exceed 255 characters'),
  body('outcome')
    .optional()
    .isIn(['SUCCESSFUL', 'NO_RESPONSE', 'CALLBACK', 'NOT_INTERESTED', 'CONVERTED', 'PENDING'])
    .withMessage('Invalid outcome'),
  body('nextFollowupDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid follow-up date')
];

export const validateActivityNote = [
  param('id').isString().withMessage('Invalid activity ID'),
  body('note').notEmpty().trim().withMessage('Note is required'),
  body('isInternal').optional().isBoolean().withMessage('isInternal must be boolean')
];