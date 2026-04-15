import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/AppError';
import { AuditService } from './audit.service';
import { FinancialHelper } from '../utils/financialHelper';
import { PaymentStatus, PaymentMethod } from '../generated/client/client';

export class PaymentService {
  private static serializePayment<T extends Record<string, any>>(payment: T): T {
    return {
      ...payment,
      amount: Number(payment.amount),
      ...(payment.deal
        ? {
            deal: {
              ...payment.deal,
              ...(payment.deal.dealAmount !== undefined
                ? {
                    dealAmount: Number(payment.deal.dealAmount),
                    discountAmount: Number(payment.deal.discountAmount),
                    taxAmount: Number(payment.deal.taxAmount),
                    finalAmount: Number(payment.deal.finalAmount)
                  }
                : {})
            }
          }
        : {})
    };
  }
  
  static async createPayment(
    companyId: bigint,
    userId: bigint,
    data: {
      dealId: bigint;
      paymentDate: Date;
      amount: number;
      paymentMethod: string;
      transactionReference?: string;
      collectedBy: bigint;
      notes?: string;
    },
    req?: any
  ) {
    // Validate deal
    const deal = await prisma.deal.findFirst({
      where: { id: data.dealId, companyId, deletedAt: null },
      include: { payments: { where: { deletedAt: null } } }
    });
    if (!deal) throw new NotFoundError('Deal not found');

    // Check if deal is already completed
    if (deal.dealStatus === 'COMPLETED') {
      throw new BadRequestError('Cannot add payment to completed deal');
    }

    // Calculate total paid so far
    const totalPaidSoFar = deal.payments.reduce(
      (sum, p) => p.paymentStatus === 'CLEARED' ? sum + Number(p.amount) : sum, 0
    );
    
    const newTotal = totalPaidSoFar + data.amount;
    const dealAmount = Number(deal.finalAmount);

    if (newTotal > dealAmount) {
      throw new BadRequestError(`Payment amount exceeds remaining balance. Maximum allowed: ${dealAmount - totalPaidSoFar}`);
    }

    // Validate collector
    const collector = await prisma.companyUser.findFirst({
      where: { id: data.collectedBy, companyId, isActive: true }
    });
    if (!collector) throw new NotFoundError('Collector not found');

    // Generate payment number
    const paymentCount = await prisma.payment.count({ where: { companyId } });
    const paymentNumber = FinancialHelper.generatePaymentNumber(companyId, paymentCount);

    // Determine initial payment status
    let paymentStatus: PaymentStatus = 'RECEIVED';
    if (data.paymentMethod === 'CHEQUE') {
      paymentStatus = 'PENDING_CLEARANCE';
    }

    const payment = await prisma.payment.create({
      data: {
        companyId,
        dealId: data.dealId,
        paymentNumber,
        paymentDate: data.paymentDate,
        amount: data.amount,
        paymentMethod: data.paymentMethod as PaymentMethod,
        transactionReference: data.transactionReference,
        collectedBy: data.collectedBy,
        paymentStatus,
        notes: data.notes
      },
      include: {
        deal: { include: { customer: true } },
        user: { include: { user: true } }
      }
    });

    // Update deal status if fully paid
    if (newTotal >= dealAmount) {
      await prisma.deal.update({
        where: { id: data.dealId },
        data: { dealStatus: 'COMPLETED' }
      });
    }

    await AuditService.create(userId, companyId, 'PAYMENT', payment.id, payment, req);
    return this.serializePayment(payment);
  }

  static async getPayments(
    companyId: bigint,
    userId: bigint,
    filters: {
      page?: number;
      limit?: number;
      dealId?: bigint;
      paymentStatus?: string;
      paymentMethod?: string;
      collectedBy?: bigint;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId, deletedAt: null };

    if (filters.dealId) where.dealId = filters.dealId;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters.collectedBy) where.collectedBy = filters.collectedBy;

    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = filters.startDate;
      if (filters.endDate) where.paymentDate.lte = filters.endDate;
    }

    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = filters.minAmount;
      if (filters.maxAmount) where.amount.lte = filters.maxAmount;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          deal: {
            include: { customer: { select: { id: true, name: true } } }
          },
          user: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.payment.count({ where })
    ]);

    return {
      data: payments.map(payment => this.serializePayment(payment)),
      meta: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  static async getPaymentById(companyId: bigint, paymentId: bigint) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, companyId, deletedAt: null },
      include: {
        deal: {
          include: { 
            customer: true,
            user: { include: { user: true } }
          }
        },
        user: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
      }
    });

    if (!payment) throw new NotFoundError('Payment not found');
    return this.serializePayment(payment);
  }

  static async updatePaymentStatus(
    companyId: bigint,
    userId: bigint,
    paymentId: bigint,
    status: string,
    req?: any
  ) {
    const existing = await prisma.payment.findFirst({
      where: { id: paymentId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Payment not found');

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { paymentStatus: status as PaymentStatus }
    });

    // If cheque cleared, check if deal is now fully paid
    if (status === 'CLEARED' && existing.paymentStatus !== 'CLEARED') {
      const deal = await prisma.deal.findFirst({
        where: { id: existing.dealId },
        include: { payments: { where: { paymentStatus: 'CLEARED' } } }
      });

      if (deal) {
        const totalCleared = deal.payments.reduce(
          (sum, p) => sum + Number(p.amount), 0
        );
        
        if (totalCleared >= Number(deal.finalAmount)) {
          await prisma.deal.update({
            where: { id: existing.dealId },
            data: { dealStatus: 'COMPLETED' }
          });
        }
      }
    }

    await AuditService.update(userId, companyId, 'PAYMENT', paymentId, existing, updated, req);
    return this.serializePayment(updated);
  }

  static async deletePayment(companyId: bigint, userId: bigint, paymentId: bigint, req?: any) {
    const existing = await prisma.payment.findFirst({
      where: { id: paymentId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Payment not found');

    const deleted = await prisma.payment.update({
      where: { id: paymentId },
      data: { deletedAt: new Date() }
    });

    // Update deal status back to active if it was completed
    const deal = await prisma.deal.findFirst({
      where: { id: existing.dealId },
      include: { payments: { where: { deletedAt: null, paymentStatus: 'CLEARED' } } }
    });

    if (deal && deal.dealStatus === 'COMPLETED') {
      const totalCleared = deal.payments.reduce(
        (sum, p) => sum + Number(p.amount), 0
      );
      
      if (totalCleared < Number(deal.finalAmount)) {
        await prisma.deal.update({
          where: { id: existing.dealId },
          data: { dealStatus: 'ACTIVE' }
        });
      }
    }

    await AuditService.delete(userId, companyId, 'PAYMENT', paymentId, existing, req);
    return deleted;
  }

  static async getPaymentStats(
    companyId: bigint,
    userId: bigint,
    dateRange?: { start: Date; end: Date }
  ) {
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    const where: any = { companyId, deletedAt: null };
    
    if (!isManager && companyUser) {
      where.collectedBy = companyUser.id;
    }

    if (dateRange) {
      where.paymentDate = { gte: dateRange.start, lte: dateRange.end };
    }

    const [
      total,
      byMethod,
      byStatus,
      totalAmount,
      avgAmount,
      cleared,
      pending
    ] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.groupBy({ by: ['paymentMethod'], where, _count: true, _sum: { amount: true } }),
      prisma.payment.groupBy({ by: ['paymentStatus'], where, _count: true, _sum: { amount: true } }),
      prisma.payment.aggregate({ where, _sum: { amount: true } }),
      prisma.payment.aggregate({ where, _avg: { amount: true } }),
      prisma.payment.aggregate({ where: { ...where, paymentStatus: 'CLEARED' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { ...where, paymentStatus: 'PENDING_CLEARANCE' }, _sum: { amount: true } })
    ]);

    return {
      totalCount: total,
      totalAmount: totalAmount._sum.amount || 0,
      averageAmount: avgAmount._avg.amount || 0,
      clearedAmount: cleared._sum.amount || 0,
      pendingClearanceAmount: pending._sum.amount || 0,
      byMethod: byMethod.map(item => ({
        method: item.paymentMethod,
        count: item._count,
        amount: item._sum.amount || 0
      })),
      byStatus: byStatus.map(item => ({
        status: item.paymentStatus,
        count: item._count,
        amount: item._sum.amount || 0
      }))
    };
  }
}
