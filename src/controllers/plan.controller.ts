import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/AppError';

export const createPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0]?.msg || 'Validation failed');
    }

    const {
      name,
      description,
      maxUsers,
      maxStorage,
      features,
      priceMonthly,
      priceYearly,
      currency
    } = req.body;

    const plan = await prisma.plan.create({
      data: {
        name,
        description,
        maxUsers,
        maxStorage: BigInt(maxStorage),
        features: features || {},
        priceMonthly,
        priceYearly,
        currency: currency || 'INR'
      }
    });

    res.status(201).json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' }
    });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
     if (!id || Array.isArray(id)) {
      throw new BadRequestError('Invalid Plan ID');
    }

    const plan = await prisma.plan.findUnique({
      where: { id: BigInt(id) }
    });

    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
      if (!id || Array.isArray(id)) {
      throw new BadRequestError('Invalid Plan ID');
    }

    const updateData = req.body;

    const plan = await prisma.plan.update({
      where: { id: BigInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
     if (!id || Array.isArray(id)) {
      throw new BadRequestError('Invalid Plan ID');
    }

    // Soft delete
    await prisma.plan.update({
      where: { id: BigInt(id) },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};