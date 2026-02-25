import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import  { BadRequestError, UnauthorizedError } from '../utils/AppError';
import emailService from '../services/email.service';
import crypto from 'crypto';

export const registerSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0]?.msg || 'Validation failed');
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if any super admin exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { isSuperAdmin: true }
    });

    if (existingSuperAdmin) {
      throw new BadRequestError('Super admin already exists');
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        isSuperAdmin: true,
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    const token = generateToken({
      userId: user.id.toString(),
      email: user.email,
      isSuperAdmin: true
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isSuperAdmin: user.isSuperAdmin
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0]?.msg || 'Validation failed');
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        companyMemberships: {
          where: { isActive: true },
          include: {
            company: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = generateToken({
      userId: user.id.toString(),
      email: user.email,
      companyId: user.companyMemberships[0]?.companyId?.toString(),
      isSuperAdmin: user.isSuperAdmin,
      role: user.companyMemberships[0]?.systemRole
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isSuperAdmin: user.isSuperAdmin,
          company: user.companyMemberships[0]?.company ? {
            id: user.companyMemberships[0].company.id,
            name: user.companyMemberships[0].company.name,
            role: user.companyMemberships[0].systemRole
          } : null
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If email exists, reset link will be sent'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken
      }
    });

    await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: 'Reset link sent to email'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: { resetToken: hashedToken }
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null
      }
    });

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        companyMemberships: {
          where: { isActive: true },
          include: {
            company: true,
            role: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
