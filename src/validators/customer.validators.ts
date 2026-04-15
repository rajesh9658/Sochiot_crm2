import { body, query, param } from 'express-validator';

export const validateCustomerCreate = [
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer')
    .toInt(),
  
  body('name')
    .notEmpty()
    .withMessage('Customer name is required')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  
  body('businessName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Business name cannot exceed 255 characters'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  
  body('pincode')
    .optional()
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode must be 6 digits'),
  
  body('leadStatus')
    .optional()
    .isIn(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONVERTED', 'LOST', 'ON_HOLD'])
    .withMessage('Invalid lead status'),
  
  body('leadSource')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Lead source cannot exceed 100 characters'),
  
  body('assignedTo')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Assigned to must be a valid ID'),
  
  body('gstNumber')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GST number format'),
  
  body('panNumber')
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN number format'),
  
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number')
    .toFloat(),
  
  body('productInterests')
    .optional()
    .isArray()
    .withMessage('Product interests must be an array'),
  
  body('productInterests.*.productCategory')
    .if(body('productInterests').exists())
    .notEmpty()
    .withMessage('Product category is required for each interest')
    .trim(),
  
  body('productInterests.*.interestLevel')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Interest level must be LOW, MEDIUM, or HIGH')
];

export const validateCustomerUpdate = [
  param('id')
    .isInt()
    .withMessage('Invalid customer ID')
    .toInt(),
  
  body('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer')
    .toInt(),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('leadStatus')
    .optional()
    .isIn(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONVERTED', 'LOST', 'ON_HOLD'])
    .withMessage('Invalid lead status'),
  
  body('assignedTo')
    .optional()
    .isString()
    .withMessage('Assigned to must be a valid ID'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

export const validateCustomerQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  
  query('leadStatus')
    .optional()
    .isIn(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONVERTED', 'LOST', 'ON_HOLD'])
    .withMessage('Invalid lead status'),
  
  query('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer')
    .toInt(),
  
  query('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format')
    .toDate(),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .toDate(),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'leadStatus', 'city'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

export const validateBulkAssign = [
  body('customerIds')
    .isArray()
    .withMessage('customerIds must be an array')
    .notEmpty()
    .withMessage('customerIds cannot be empty'),
  
  body('customerIds.*')
    .isString()
    .withMessage('Each customer ID must be a string'),
  
  body('assignedTo')
    .notEmpty()
    .withMessage('assignedTo is required')
    .isString()
    .withMessage('assignedTo must be a string')
];

export const validateProductInterest = [
  body('productCategory')
    .notEmpty()
    .withMessage('Product category is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Product category cannot exceed 100 characters'),
  
  body('productName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Product name cannot exceed 255 characters'),
  
  body('quantityEstimate')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Quantity estimate cannot exceed 100 characters'),
  
  body('budgetRange')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Budget range cannot exceed 100 characters'),
  
  body('interestLevel')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Interest level must be LOW, MEDIUM, or HIGH'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];