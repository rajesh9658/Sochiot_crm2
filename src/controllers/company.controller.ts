import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/AppError';
import { hashPassword } from '../utils/password';
import emailService from '../services/email.service';
import crypto from 'crypto';

export const registerCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArray = errors.array();
      throw new BadRequestError(errorArray[0]?.msg || 'Validation failed');
    }

    const {
      name,
      industry,
      phone,
      email,
      address,
      city,
      state,
      country,
      planId,
      adminEmail,
      adminFirstName,
      adminLastName,
      adminPassword
    } = req.body;

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: BigInt(planId), isActive: true }
    });

    if (!plan) {
      throw new BadRequestError('Invalid plan');
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name,
        industry,
        phone,
        email,
        address,
        city,
        state,
        country: country || 'India',
        planId: BigInt(planId),
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    // Create company user
    await prisma.companyUser.create({
      data: {
        companyId: company.id,
        userId: user.id,
        employeeCode: `EMP${company.id}${user.id}`.slice(0, 50),
        systemRole: 'COMPANY_ADMIN',
        isActive: true,
        joiningDate: new Date()
      }
    });

    // Update company user count
    await prisma.company.update({
      where: { id: company.id },
      data: { currentUsers: { increment: 1 } }
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(adminEmail, adminFirstName, adminPassword);

    res.status(201).json({
      success: true,
      data: {
        company: {
          id: company.id,
          name: company.name,
          subscriptionStatus: company.subscriptionStatus
        },
        admin: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (status) {
      where.isActive = status === 'active';
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          plan: true,
          _count: {
            select: {
              users: true,
              customers: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.company.count({ where })
    ]);

    res.json({
      success: true,
      data: companies,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if( !id || Array.isArray(id) ) {
        throw new BadRequestError('Company ID is required');
        }
    const company = await prisma.company.findUnique({
      where: { id: BigInt(id) },
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
        },
        _count: {
          select: {
            customers: true,
            deals: true,
            activities: true
          }
        }
      }
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || Array.isArray(id)) {
    throw new BadRequestError('Invalid or missing company ID');
    }
    const company = await prisma.company.update({
      where: { id: BigInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};


export const updateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { planId, subscriptionStatus } = req.body;

    if (!id || Array.isArray(id)) {
      throw new BadRequestError('Company ID is required');
    }

    // Build the data object conditionally
    const updateData: any = {
      subscriptionStatus
    };

    // Only add planId if it exists
    if (planId) {
      updateData.planId = BigInt(planId);
      updateData.subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const company = await prisma.company.update({
      where: { id: BigInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

export const approveCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      throw new BadRequestError('Company ID is required');
    }

    const company = await prisma.company.update({
      where: { id: BigInt(id) },
      data: { isActive: true }
    });

    res.json({
      success: true,
      message: 'Company approved successfully',
      data: company
    });
  } catch (error) {
    next(error);
  }
};