import { prisma } from '../config/database';
import { NotFoundError } from '../utils/AppError';
import { AuditService } from './audit.service';
import { InterestLevel } from '../generated/client/client';

export class ProductInterestService {
  
  static async addInterest(
    companyId: bigint,
    userId: bigint,
    customerId: bigint,
    data: {
      productCategory: string;
      productName?: string;
      quantityEstimate?: string;
      budgetRange?: string;
      interestLevel: string;
      notes?: string;
    },
    req?: any
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId, deletedAt: null }
    });
    if (!customer) throw new NotFoundError('Customer not found');

    const interest = await prisma.productInterest.create({
      data: {
        companyId,
        customerId,
        productCategory: data.productCategory,
        productName: data.productName,
        quantityEstimate: data.quantityEstimate,
        budgetRange: data.budgetRange,
        interestLevel: data.interestLevel as InterestLevel,
        notes: data.notes
      }
    });

    await AuditService.create(userId, companyId, 'PRODUCT_INTEREST', interest.id, interest, req);
    return interest;
  }

  static async getCustomerInterests(companyId: bigint, customerId: bigint) {
    return prisma.productInterest.findMany({
      where: { companyId, customerId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async updateInterest(
    companyId: bigint,
    userId: bigint,
    interestId: bigint,
    data: {
      productCategory?: string;
      productName?: string;
      quantityEstimate?: string;
      budgetRange?: string;
      interestLevel?: string;
      notes?: string;
    },
    req?: any
  ) {
    const existing = await prisma.productInterest.findFirst({
      where: { id: interestId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Product interest not found');

    const updated = await prisma.productInterest.update({
      where: { id: interestId },
      data: {
        productCategory: data.productCategory,
        productName: data.productName,
        quantityEstimate: data.quantityEstimate,
        budgetRange: data.budgetRange,
        interestLevel: data.interestLevel as InterestLevel,
        notes: data.notes
      }
    });

    await AuditService.update(userId, companyId, 'PRODUCT_INTEREST', interestId, existing, updated, req);
    return updated;
  }

  static async deleteInterest(companyId: bigint, userId: bigint, interestId: bigint, req?: any) {
    const existing = await prisma.productInterest.findFirst({
      where: { id: interestId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Product interest not found');

    await prisma.productInterest.update({
      where: { id: interestId },
      data: { deletedAt: new Date() }
    });

    await AuditService.delete(userId, companyId, 'PRODUCT_INTEREST', interestId, existing, req);
    return { success: true };
  }

  static async getCategorySummary(companyId: bigint) {
    return prisma.productInterest.groupBy({
      by: ['productCategory'],
      where: { companyId, deletedAt: null },
      _count: true,
      orderBy: { _count: { productCategory: 'desc' } }
    });
  }
}