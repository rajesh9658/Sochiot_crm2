import { prisma } from '../config/database';
import { NotFoundError } from '../utils/AppError';
import { PDFGenerator } from '../utils/pdfGenerator';
import { Response } from 'express';

export class InvoiceService {
  
  static async generateInvoice(companyId: bigint, dealId: bigint, res: Response) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, companyId, deletedAt: null },
      include: {
        customer: true,
        payments: {
          where: { deletedAt: null },
          orderBy: { paymentDate: 'desc' }
        },
        user: {
          include: { user: true }
        }
      }
    });

    if (!deal) throw new NotFoundError('Deal not found');

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) throw new NotFoundError('Company not found');

    const pdfBuffer = await PDFGenerator.generateInvoice(
      deal,
      deal.customer,
      company,
      deal.payments
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${deal.dealNumber}.pdf`);
    res.send(pdfBuffer);
  }

  static async getPaymentReceipt(companyId: bigint, paymentId: bigint, res: Response) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, companyId, deletedAt: null },
      include: {
        deal: {
          include: { customer: true }
        },
        user: {
          include: { user: true }
        }
      }
    });

    if (!payment) throw new NotFoundError('Payment not found');

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) throw new NotFoundError('Company not found');

    // Simplified receipt generation
    const pdfBuffer = await PDFGenerator.generateInvoice(
      payment.deal,
      payment.deal.customer,
      company,
      [payment]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${payment.paymentNumber}.pdf`);
    res.send(pdfBuffer);
  }
}