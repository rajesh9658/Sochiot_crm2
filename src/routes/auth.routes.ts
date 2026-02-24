import { Router } from 'express';
import { body } from 'express-validator';
import {
  registerSuperAdmin,
  login,
  forgotPassword,
  resetPassword,
  getMe
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail()
];

const resetPasswordValidation = [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 })
];

// Routes
router.post('/register-super-admin', registerValidation, registerSuperAdmin);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/me', authenticate, getMe);

export default router;