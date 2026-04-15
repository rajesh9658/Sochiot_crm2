import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { DealService } from '../services/deal.service';
import { InvoiceService } from '../services/invoice.service';
import { BadRequestError } from '../utils/AppError';

export const createDeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;

    const deal = await DealService.createDeal(
      companyId,
      userId,
      {
        customerId: BigInt(req.body.customerId),
        userId: BigInt(req.body.userId),
        dealDate: new Date(req.body.dealDate),
        dealAmount: parseFloat(req.body.dealAmount),
        discountAmount: req.body.discountAmount ? parseFloat(req.body.discountAmount) : undefined,
        taxAmount: req.body.taxAmount ? parseFloat(req.body.taxAmount) : undefined,
        finalAmount: req.body.finalAmount ? parseFloat(req.body.finalAmount) : undefined,
        paymentTerms: req.body.paymentTerms,
        expectedDeliveryDate: req.body.expectedDeliveryDate ? new Date(req.body.expectedDeliveryDate) : undefined,
        notes: req.body.notes
      },
      req
    );

    res.status(201).json({
      success: true,
      data: deal,
      message: 'Deal created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getDeals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const {
      page, limit, status, customerId, assignedTo,
      startDate, endDate, minAmount, maxAmount, sortBy, sortOrder
    } = req.query;

    const result = await DealService.getDeals(companyId, userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      customerId: customerId ? BigInt(customerId as string) : undefined,
      userId: assignedTo ? BigInt(assignedTo as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

export const getDealById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    const deal = await DealService.getDealById(companyId, BigInt(id as string));

    res.json({
      success: true,
      data: deal
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    const deal = await DealService.updateDeal(
      companyId,
      userId,
      BigInt(id as string),
      {
        dealAmount: req.body.dealAmount ? parseFloat(req.body.dealAmount) : undefined,
        discountAmount: req.body.discountAmount ? parseFloat(req.body.discountAmount) : undefined,
        taxAmount: req.body.taxAmount ? parseFloat(req.body.taxAmount) : undefined,
        finalAmount: req.body.finalAmount ? parseFloat(req.body.finalAmount) : undefined,
        paymentTerms: req.body.paymentTerms,
        expectedDeliveryDate: req.body.expectedDeliveryDate ? new Date(req.body.expectedDeliveryDate) : undefined,
        dealStatus: req.body.dealStatus,
        notes: req.body.notes
      },
      req
    );

    res.json({
      success: true,
      data: deal,
      message: 'Deal updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    await DealService.deleteDeal(companyId, userId, BigInt(id as string ), req);

    res.json({
      success: true,
      message: 'Deal deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getDealStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const stats = await DealService.getDealStats(companyId, userId, {
          start: startDate ? new Date(startDate as string) : new Date(0),
          end: endDate ? new Date(endDate as string) : new Date()
        });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const downloadInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    await InvoiceService.generateInvoice(companyId, BigInt(id as string), res);
  } catch (error) {
    next(error);
  }
};