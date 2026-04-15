import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/AppError';
import { AuditService } from '../services/audit.service';

// Add product interest to customer
export const addProductInterest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { customerId } = req.params;

    // Check customer exists
    const customer = await prisma.customer.findFirst({
      where: {
        id: BigInt(customerId as string),
        companyId,
        deletedAt: null
      }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const productInterest = await prisma.productInterest.create({
      data: {
        companyId,
        customerId: BigInt(customerId as string),
        productCategory: req.body.productCategory,
        productName: req.body.productName,
        quantityEstimate: req.body.quantityEstimate,
        budgetRange: req.body.budgetRange,
        interestLevel: req.body.interestLevel || 'MEDIUM',
        notes: req.body.notes
      }
    });

    await AuditService.create(
      userId,
      companyId,
      'PRODUCT_INTEREST',
      productInterest.id,
      productInterest,
      req
    );

    res.status(201).json({
      success: true,
      data: productInterest,
      message: 'Product interest added successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get customer's product interests
export const getProductInterests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const { customerId } = req.params;

    const interests = await prisma.productInterest.findMany({
      where: {
        companyId,
        customerId: BigInt(customerId as string ),
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: interests
    });
  } catch (error) {
    next(error);
  }
};

// Update product interest
export const updateProductInterest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.productInterest.findFirst({
      where: {
        id: BigInt(id as string),
        companyId,
        deletedAt: null
      }
    });

    if (!existing) {
      throw new NotFoundError('Product interest not found');
    }

    const updated = await prisma.productInterest.update({
      where: { id: BigInt(id as string ) },
      data: {
        productCategory: req.body.productCategory,
        productName: req.body.productName,
        quantityEstimate: req.body.quantityEstimate,
        budgetRange: req.body.budgetRange,
        interestLevel: req.body.interestLevel,
        notes: req.body.notes
      }
    });

    await AuditService.update(
      userId,
      companyId,
      'PRODUCT_INTEREST',
      BigInt(id as string ),
      existing,
      updated,
      req
    );

    res.json({
      success: true,
      data: updated,
      message: 'Product interest updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete product interest
export const deleteProductInterest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.productInterest.findFirst({
      where: {
        id: BigInt(id as string),
        companyId,
        deletedAt: null
      }
    });

    if (!existing) {
      throw new NotFoundError('Product interest not found');
    }

    await prisma.productInterest.update({
      where: { id: BigInt(id as string) },
      data: { deletedAt: new Date() }
    });

    await AuditService.delete(
      userId,
      companyId,
      'PRODUCT_INTEREST',
      BigInt(id as string),
      existing,
      req
    );

    res.json({
      success: true,
      message: 'Product interest deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get product categories summary
export const getProductCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;

    const categories = await prisma.productInterest.groupBy({
      by: ['productCategory'],
      where: {
        companyId,
        deletedAt: null
      },
      _count: true,
      orderBy: { _count: { productCategory: 'desc' } }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};