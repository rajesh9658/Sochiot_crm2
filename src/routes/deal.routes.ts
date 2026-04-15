import { Router } from 'express';
import { body } from 'express-validator';
import {
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  getDealStats,
  downloadInvoice
} from '../controllers/deal.controller';
import { authenticate, requireCompanyAccess } from '../middleware/auth';

const router = Router();

const dealValidation = [
  body('customerId').isString().notEmpty(),
  body('userId').isString().notEmpty(),
  body('dealDate').isISO8601(),
  body('dealAmount').isFloat({ min: 0 }),
  body('discountAmount').optional().isFloat({ min: 0 }),
  body('taxAmount').optional().isFloat({ min: 0 }),
  body('finalAmount').optional().isFloat({ min: 0 }),
  body('paymentTerms').optional().trim(),
  body('expectedDeliveryDate').optional().isISO8601(),
  body('notes').optional().trim()
];

const updateDealValidation = [
  body('dealAmount').optional().isFloat({ min: 0 }),
  body('discountAmount').optional().isFloat({ min: 0 }),
  body('taxAmount').optional().isFloat({ min: 0 }),
  body('finalAmount').optional().isFloat({ min: 0 }),
  body('dealStatus').optional().isIn(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD']),
  body('expectedDeliveryDate').optional().isISO8601()
];

router.use(authenticate);
router.use(requireCompanyAccess);

router.get('/stats', getDealStats);
router.post('/', dealValidation, createDeal);
router.get('/', getDeals);
router.get('/:id', getDealById);
router.get('/:id/invoice', downloadInvoice);
router.put('/:id', updateDealValidation, updateDeal);
router.delete('/:id', deleteDeal);

export default router;