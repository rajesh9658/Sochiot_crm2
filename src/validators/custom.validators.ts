import  { body, param, query, type ValidationChain } from 'express-validator';
import { prisma } from '../config/database';

export const validate = {
  // Common IDs
  id: (field: string = 'id'): ValidationChain => 
    param(field).isInt().toInt(),

  companyId: (field: string = 'companyId'): ValidationChain =>
    body(field).optional().isInt().toInt(),

  userId: (field: string = 'userId'): ValidationChain =>
    body(field).isInt().toInt(),

  // Pagination
  pagination: (): ValidationChain[] => [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],

  // Date ranges
  dateRange: (): ValidationChain[] => [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
      .custom((endDate, { req }) => {
        if (req.query?.startDate && endDate < new Date(req.query.startDate as string)) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
  ],

  // Email
  email: (field: string = 'email'): ValidationChain =>
    body(field).isEmail().normalizeEmail(),

  // Password
  password: (field: string = 'password'): ValidationChain =>
    body(field)
      .isLength({ min: 8 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)
      .withMessage('Password must contain at least 8 characters, one letter, one number, and one special character'),

  // Phone (Indian format)
  phone: (field: string = 'phone'): ValidationChain =>
    body(field)
      .optional()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please enter a valid 10-digit Indian mobile number'),

  // Check existence
  exists: (model: string, field: string = 'id') => 
    body(field).custom(async (value) => {
      const record = await (prisma as any)[model].findUnique({
        where: { id: BigInt(value) }
      });
      if (!record) {
        throw new Error(`${model} with id ${value} not found`);
      }
      return true;
    }),

  // Unique check
  unique: (model: string, field: string, companyScoped: boolean = false) =>
    body(field).custom(async (value, { req }) => {
      const where: any = { [field]: value };
      
      if (companyScoped && req.user?.companyId) {
        where.companyId = req.user.companyId;
      }

      const existing = await (prisma as any)[model].findFirst({ where });
      
      if (existing) {
        throw new Error(`${field} already exists`);
      }
      return true;
    })
};

// Specific validators for each module
export const userValidators = {
  invite: [
    validate.email('email'),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('systemRole').isIn(['COMPANY_ADMIN', 'MANAGER', 'FIELD_SALES', 'SALES_EXECUTIVE']),
    body('managerId').optional().isInt().toInt(),
    body('territory').optional().trim(),
    body('joiningDate').optional().isISO8601().toDate()
  ],

  update: [
    body('systemRole').optional().isIn(['COMPANY_ADMIN', 'MANAGER', 'FIELD_SALES', 'SALES_EXECUTIVE']),
    body('managerId').optional({ nullable: true }).isInt().toInt(),
    body('territory').optional().trim(),
    body('isActive').optional().isBoolean()
  ]
};

export const roleValidators = {
  create: [
    body('name').notEmpty().trim(),
    body('description').optional().trim(),
    body('permissionIds').isArray().notEmpty(),
    body('permissionIds.*').isInt()
  ]
};

export const categoryValidators = {
  create: [
    body('name').notEmpty().trim(),
    body('description').optional().trim()
  ]
};
