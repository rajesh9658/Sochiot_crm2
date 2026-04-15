import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/AppError';
import { AuditService } from './audit.service';
import { FinancialHelper } from '../utils/financialHelper';
import { DealStatus } from '../generated/client/client';

export class DealService {
  private static serializeDeal<T extends Record<string, any>>(deal: T): T {
    return {
      ...deal,
      dealAmount: Number(deal.dealAmount),
      discountAmount: Number(deal.discountAmount),
      taxAmount: Number(deal.taxAmount),
      finalAmount: Number(deal.finalAmount),
      ...(deal.paymentInfo
        ? {
            paymentInfo: {
              ...deal.paymentInfo,
              totalPaid: Number(deal.paymentInfo.totalPaid),
              remainingAmount: Number(deal.paymentInfo.remainingAmount),
              percentagePaid: Number(deal.paymentInfo.percentagePaid)
            }
          }
        : {})
    };
  }
  
  static async createDeal(
    companyId: bigint,
    userId: bigint,
    data: {
      customerId: bigint;
      userId: bigint;
      dealDate: Date;
      dealAmount: number;
      discountAmount?: number;
      taxAmount?: number;
      finalAmount?: number;
      paymentTerms?: string;
      expectedDeliveryDate?: Date;
      notes?: string;
    },
    req?: any
  ) {
    // Validate customer
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId, deletedAt: null }
    });
    if (!customer) throw new NotFoundError('Customer not found');

    // Validate user
    const companyUser = await prisma.companyUser.findFirst({
      where: { id: data.userId, companyId, isActive: true }
    });
    if (!companyUser) throw new NotFoundError('User not found');

    // Calculate financials if not provided
    let finalAmount = data.finalAmount;
    let discountAmount = data.discountAmount || 0;
    let taxAmount = data.taxAmount || 0;

    if (!finalAmount) {
      const calculation = FinancialHelper.calculateFinalAmount(
        data.dealAmount,
        discountAmount,
        taxAmount > 0 ? (taxAmount / data.dealAmount) * 100 : 18
      );
      finalAmount = calculation.finalAmount;
      if (!data.taxAmount) taxAmount = calculation.taxAmount;
    }

    // Generate deal number
    const dealCount = await prisma.deal.count({ where: { companyId } });
    const dealNumber = FinancialHelper.generateDealNumber(companyId, dealCount);

    const deal = await prisma.deal.create({
      data: {
        companyId,
        dealNumber,
        customerId: data.customerId,
        userId: data.userId,
        dealDate: data.dealDate,
        dealAmount: data.dealAmount,
        discountAmount,
        taxAmount,
        finalAmount,
        paymentTerms: data.paymentTerms,
        expectedDeliveryDate: data.expectedDeliveryDate,
        notes: data.notes,
        dealStatus: 'ACTIVE'
      },
      include: {
        customer: {
          include: { category: true }
        },
        user: {
          include: { user: true }
        }
      }
    });

    // Update customer lead status to PROPOSAL if still in earlier stage
    if (!['PROPOSAL', 'NEGOTIATION', 'CONVERTED'].includes(customer.leadStatus)) {
      await prisma.customer.update({
        where: { id: data.customerId },
        data: { leadStatus: 'PROPOSAL' }
      });
    }

    await AuditService.create(userId, companyId, 'DEAL', deal.id, deal, req);
    return this.serializeDeal(deal);
  }

  static async getDeals(
    companyId: bigint,
    userId: bigint,
    filters: {
      page?: number;
      limit?: number;
      status?: string;
      customerId?: bigint;
      userId?: bigint;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    const where: any = { companyId, deletedAt: null };

    if (filters.status) where.dealStatus = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    
    if (!isManager && filters.userId !== userId) {
      where.userId = companyUser?.id;
    } else if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.dealDate = {};
      if (filters.startDate) where.dealDate.gte = filters.startDate;
      if (filters.endDate) where.dealDate.lte = filters.endDate;
    }

    if (filters.minAmount || filters.maxAmount) {
      where.finalAmount = {};
      if (filters.minAmount) where.finalAmount.gte = filters.minAmount;
      if (filters.maxAmount) where.finalAmount.lte = filters.maxAmount;
    }

    const sortField = filters.sortBy || 'dealDate';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: any = { [sortField]: sortOrder };

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, customerCode: true, phone: true, email: true } },
          user: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          payments: {
            where: { deletedAt: null },
            select: { id: true, amount: true, paymentStatus: true, paymentDate: true }
          }
        },
        skip,
        take: limit,
        orderBy
      }),
      prisma.deal.count({ where })
    ]);

    // Add payment status to each deal
    const dealsWithStatus = deals.map(deal => this.serializeDeal({
      ...deal,
      paymentInfo: FinancialHelper.getPaymentStatus(deal)
    }));

    return { data: dealsWithStatus, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getDealById(companyId: bigint, dealId: bigint) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, companyId, deletedAt: null },
      include: {
        customer: {
          include: { category: true, assignedUser: { include: { user: true } } }
        },
        user: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        payments: {
          where: { deletedAt: null },
          include: {
            user: { include: { user: { select: { firstName: true, lastName: true } } } }
          },
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    if (!deal) throw new NotFoundError('Deal not found');
    
    return this.serializeDeal({
      ...deal,
      paymentInfo: FinancialHelper.getPaymentStatus(deal)
    });
  }

  static async updateDeal(
    companyId: bigint,
    userId: bigint,
    dealId: bigint,
    data: {
      dealAmount?: number;
      discountAmount?: number;
      taxAmount?: number;
      finalAmount?: number;
      paymentTerms?: string;
      expectedDeliveryDate?: Date;
      dealStatus?: string;
      notes?: string;
    },
    req?: any
  ) {
    const existing = await prisma.deal.findFirst({
      where: { id: dealId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Deal not found');

    // Recalculate final amount if deal amount or discount changed
    let finalAmount = data.finalAmount;
    if ((data.dealAmount || data.discountAmount) && !finalAmount) {
      const calculation = FinancialHelper.calculateFinalAmount(
        data.dealAmount || Number(existing.dealAmount),
        data.discountAmount || Number(existing.discountAmount),
        18
      );
      finalAmount = calculation.finalAmount;
      data.taxAmount = calculation.taxAmount;
    }

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: {
        dealAmount: data.dealAmount,
        discountAmount: data.discountAmount,
        taxAmount: data.taxAmount,
        finalAmount,
        paymentTerms: data.paymentTerms,
        expectedDeliveryDate: data.expectedDeliveryDate,
        dealStatus: data.dealStatus as DealStatus,
        notes: data.notes
      }
    });

    // If deal is completed, update customer lead status
    if (data.dealStatus === 'COMPLETED' && existing.dealStatus !== 'COMPLETED') {
      await prisma.customer.update({
        where: { id: existing.customerId },
        data: { leadStatus: 'CONVERTED' }
      });
    }

    await AuditService.update(userId, companyId, 'DEAL', dealId, existing, updated, req);
    return this.serializeDeal(updated);
  }

  static async deleteDeal(companyId: bigint, userId: bigint, dealId: bigint, req?: any) {
    const existing = await prisma.deal.findFirst({
      where: { id: dealId, companyId, deletedAt: null },
      include: { payments: { where: { deletedAt: null } } }
    });
    if (!existing) throw new NotFoundError('Deal not found');
    
    if (existing.payments.length > 0) {
      throw new BadRequestError('Cannot delete deal with existing payments');
    }

    const deleted = await prisma.deal.update({
      where: { id: dealId },
      data: { deletedAt: new Date() }
    });

    await AuditService.delete(userId, companyId, 'DEAL', dealId, existing, req);
    return deleted;
  }

  static async getDealStats(
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
      where.userId = companyUser.id;
    }

    if (dateRange) {
      where.dealDate = { gte: dateRange.start, lte: dateRange.end };
    }

    const [
      total,
      byStatus,
      totalValue,
      avgValue,
      completed,
      cancelled
    ] = await Promise.all([
      prisma.deal.count({ where }),
      prisma.deal.groupBy({ by: ['dealStatus'], where, _count: true }),
      prisma.deal.aggregate({ where, _sum: { finalAmount: true } }),
      prisma.deal.aggregate({ where, _avg: { finalAmount: true } }),
      prisma.deal.count({ where: { ...where, dealStatus: 'COMPLETED' } }),
      prisma.deal.count({ where: { ...where, dealStatus: 'CANCELLED' } })
    ]);

    const conversionRate = total > 0 ? (completed / total) * 100 : 0;

    // Get top customers by deal value
    const topCustomers = await prisma.deal.groupBy({
      by: ['customerId'],
      where,
      _sum: { finalAmount: true },
      orderBy: { _sum: { finalAmount: 'desc' } },
      take: 5
    });

    const customersWithNames = await Promise.all(
      topCustomers.map(async (item) => {
        const customer = await prisma.customer.findUnique({
          where: { id: item.customerId },
          select: { id: true, name: true }
        });
        return {
          customerId: item.customerId,
          customerName: customer?.name || 'Unknown',
          totalValue: item._sum.finalAmount || 0
        };
      })
    );

    return {
      total,
      completed,
      cancelled,
      conversionRate,
      totalValue: totalValue._sum.finalAmount || 0,
      averageValue: avgValue._avg.finalAmount || 0,
      byStatus: byStatus.map(item => ({ status: item.dealStatus, count: item._count })),
      topCustomers: customersWithNames
    };
  }
}
