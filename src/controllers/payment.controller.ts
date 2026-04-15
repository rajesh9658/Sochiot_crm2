import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { PaymentService } from '../services/payment.service';
import { InvoiceService } from '../services/invoice.service';
import { BadRequestError } from '../utils/AppError';

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;

    const payment = await PaymentService.createPayment(
      companyId,
      userId,
      {
        dealId: BigInt(req.body.dealId),
        paymentDate: new Date(req.body.paymentDate),
        amount: parseFloat(req.body.amount),
        paymentMethod: req.body.paymentMethod,
        transactionReference: req.body.transactionReference,
        collectedBy: BigInt(req.body.collectedBy),
        notes: req.body.notes
      },
      req
    );

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const {
      page, limit, dealId, paymentStatus, paymentMethod,
      collectedBy, startDate, endDate, minAmount, maxAmount
    } = req.query;

    const result = await PaymentService.getPayments(companyId, userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      dealId: dealId ? BigInt(dealId as string) : undefined,
      paymentStatus: paymentStatus as string,
      paymentMethod: paymentMethod as string,
      collectedBy: collectedBy ? BigInt(collectedBy as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined
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

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    const payment = await PaymentService.getPaymentById(companyId, BigInt(id as string));

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;

    const payment = await PaymentService.updatePaymentStatus(
      companyId,
      userId,
      BigInt(id as string),
      status,
      req
    );

    res.json({
      success: true,
      data: payment,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deletePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    await PaymentService.deletePayment(companyId, userId, BigInt(id as string), req);

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const stats = await PaymentService.getPaymentStats(companyId, userId, {
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

export const downloadReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    await InvoiceService.getPaymentReceipt(companyId, BigInt(id as string), res);
  } catch (error) {
    next(error);
  }
};