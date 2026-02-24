import { Router } from 'express';
import { body } from 'express-validator';
import {
  registerCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  updateSubscription,
  approveCompany
} from '../controllers/company.controller';
import { authenticate, requireSuperAdmin, requireCompanyAccess } from '../middleware/auth';
import { prisma } from '../config/database';
const router = Router();

const companyRegistrationValidation = [
  body('name').notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty(),
  body('planId').notEmpty(),
  body('adminEmail').isEmail().normalizeEmail(),
  body('adminFirstName').notEmpty(),
  body('adminLastName').notEmpty(),
  body('adminPassword').isLength({ min: 8 })
];

const companyUpdateValidation = [
  body('name').optional().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().notEmpty()
];

// Public route for company registration
router.post('/register', companyRegistrationValidation, registerCompany);

// Protected routes
router.use(authenticate);

// Company admin routes (their own company)
router.get('/my-company', requireCompanyAccess, async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId! },
      include: {
        plan: true,
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                status: true
              }
            }
          }
        }
      }
    });
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
});

// Super admin only routes
router.get('/', requireSuperAdmin, getCompanies);
router.get('/:id', requireSuperAdmin, getCompanyById);
router.put('/:id', requireSuperAdmin, companyUpdateValidation, updateCompany);
router.patch('/:id/subscription', requireSuperAdmin, updateSubscription);
router.post('/:id/approve', requireSuperAdmin, approveCompany);

export default router;
