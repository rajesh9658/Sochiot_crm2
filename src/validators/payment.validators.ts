import { body, query, param } from 'express-validator';

export const validatePaymentCreate = [
  body('dealId').isString().withMessage('Deal ID is required'),
  body('paymentDate').isISO8601().withMessage('Invalid payment date'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('paymentMethod')
    .isIn(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI', 'CARD'])
    .withMessage('Invalid payment method'),
  body('transactionReference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Transaction reference cannot exceed 100 characters'),
  body('collectedBy').isString().withMessage('Collector ID is required'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

export const validatePaymentStatus = [
  param('id').isString().withMessage('Invalid payment ID'),
  body('status')
    .isIn(['RECEIVED', 'PENDING_CLEARANCE', 'CLEARED', 'BOUNCED'])
    .withMessage('Invalid payment status')
];