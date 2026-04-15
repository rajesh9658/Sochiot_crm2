import { body, query, param } from 'express-validator';

export const validateDealCreate = [
  body('customerId').isString().withMessage('Customer ID is required'),
  body('userId').isString().withMessage('User ID is required'),
  body('dealDate').isISO8601().withMessage('Invalid deal date'),
  body('dealAmount')
    .isFloat({ min: 0 })
    .withMessage('Deal amount must be a positive number'),
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number'),
  body('taxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax amount must be a positive number'),
  body('paymentTerms')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Payment terms cannot exceed 255 characters'),
  body('expectedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expected delivery date')
];

export const validateDealUpdate = [
  param('id').isString().withMessage('Invalid deal ID'),
  body('dealAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Deal amount must be a positive number'),
  body('dealStatus')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'])
    .withMessage('Invalid deal status')
];