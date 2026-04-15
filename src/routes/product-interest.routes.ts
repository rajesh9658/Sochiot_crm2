import { Router } from 'express';
import { body } from 'express-validator';
import {
  addProductInterest,
  getProductInterests,
  updateProductInterest,
  deleteProductInterest,
  getProductCategories
} from '../controllers/product-interest.controller';
import { authenticate, requireCompanyAccess } from '../middleware/auth';

const router = Router();

const productInterestValidation = [
  body('productCategory').notEmpty().trim(),
  body('productName').optional().trim(),
  body('quantityEstimate').optional().trim(),
  body('budgetRange').optional().trim(),
  body('interestLevel').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('notes').optional().trim()
];

router.use(authenticate);
router.use(requireCompanyAccess);

router.get('/categories', getProductCategories);
router.get('/customer/:customerId', getProductInterests);
router.post('/customer/:customerId', productInterestValidation, addProductInterest);
router.put('/:id', productInterestValidation, updateProductInterest);
router.delete('/:id', deleteProductInterest);

export default router;