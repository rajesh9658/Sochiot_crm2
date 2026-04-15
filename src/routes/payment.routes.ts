import { Router } from 'express';
import { body } from 'express-validator';
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePaymentStatus,
  deletePayment,
  getPaymentStats,
  downloadReceipt
} from '../controllers/payment.controller';
import { authenticate, requireCompanyAccess } from '../middleware/auth';

const router = Router();

const paymentValidation = [
  body('dealId').isString().notEmpty(),
  body('paymentDate').isISO8601(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMethod').isIn(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI', 'CARD']),
  body('transactionReference').optional().trim(),
  body('collectedBy').isString().notEmpty(),
  body('notes').optional().trim()
];

const statusValidation = [
  body('status').isIn(['RECEIVED', 'PENDING_CLEARANCE', 'CLEARED', 'BOUNCED'])
];

router.use(authenticate);
router.use(requireCompanyAccess);

router.get('/stats', getPaymentStats);
router.post('/', paymentValidation, createPayment);
router.get('/', getPayments);
router.get('/:id', getPaymentById);
router.get('/:id/receipt', downloadReceipt);
router.patch('/:id/status', statusValidation, updatePaymentStatus);
router.delete('/:id', deletePayment);

export default router;