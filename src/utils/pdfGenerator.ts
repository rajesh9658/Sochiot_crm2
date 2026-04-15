import PDFDocument from 'pdfkit';
import { FinancialHelper } from './financialHelper';
import { Response } from 'express';

export class PDFGenerator {
  
  static async generateInvoice(
    deal: any,
    customer: any,
    company: any,
    payments: any[]
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Company Details
      doc.fontSize(10);
      doc.text(company.name, { align: 'center' });
      doc.text(company.address || '', { align: 'center' });
      doc.text(`Phone: ${company.phone || ''} | Email: ${company.email || ''}`, { align: 'center' });
      doc.text(`GST: ${company.gstNumber || 'Not Registered'}`, { align: 'center' });
      doc.moveDown();
      
      // Bill To
      doc.fontSize(12).text('Bill To:', { underline: true });
      doc.fontSize(10);
      doc.text(customer.businessName || customer.name);
      doc.text(customer.address || '');
      doc.text(`GST: ${customer.gstNumber || 'Not Registered'}`);
      doc.text(`PAN: ${customer.panNumber || 'Not Available'}`);
      doc.moveDown();
      
      // Invoice Details
      const invoiceDate = new Date().toLocaleDateString('en-IN');
      doc.text(`Invoice Number: INV-${deal.dealNumber}`, { continued: true });
      doc.text(`Date: ${invoiceDate}`, { align: 'right' });
      
      doc.text(`Deal Number: ${deal.dealNumber}`, { continued: true });
      doc.text(`Due Date: ${new Date(deal.expectedDeliveryDate || deal.createdAt).toLocaleDateString('en-IN')}`, { align: 'right' });
      doc.moveDown();
      
      // Items Table
      const tableTop = doc.y;
      const itemX = 50;
      const descX = 150;
      const qtyX = 350;
      const rateX = 400;
      const amountX = 480;
      
      doc.fontSize(10);
      doc.text('Sl No', itemX, tableTop);
      doc.text('Description', descX, tableTop);
      doc.text('Qty', qtyX, tableTop);
      doc.text('Rate', rateX, tableTop);
      doc.text('Amount', amountX, tableTop);
      
      doc.moveTo(itemX, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();
      
      let y = tableTop + 25;
      let total = 0;
      
      // Assuming deal has items or using deal amount as single item
      doc.text('1', itemX, y);
      doc.text('Products/Services', descX, y);
      doc.text('1', qtyX, y);
      doc.text(FinancialHelper.formatCurrency(Number(deal.dealAmount)), rateX, y);
      doc.text(FinancialHelper.formatCurrency(Number(deal.dealAmount)), amountX, y);
      total += Number(deal.dealAmount);
      
      y += 25;
      
      // Totals
      doc.moveTo(itemX, y)
        .lineTo(550, y)
        .stroke();
      
      y += 10;
      doc.text('Sub Total:', 400, y);
      doc.text(FinancialHelper.formatCurrency(total), 480, y);
      
      y += 20;
      if (Number(deal.discountAmount) > 0) {
        doc.text(`Discount (${((Number(deal.discountAmount) / total) * 100).toFixed(2)}%):`, 400, y);
        doc.text(`-${FinancialHelper.formatCurrency(Number(deal.discountAmount))}`, 480, y);
        y += 20;
      }
      
      doc.text(`GST (${((Number(deal.taxAmount) / (total - Number(deal.discountAmount))) * 100).toFixed(2)}%):`, 400, y);
      doc.text(FinancialHelper.formatCurrency(Number(deal.taxAmount)), 480, y);
      
      y += 20;
      doc.fontSize(12);
      doc.text('Total Amount:', 400, y);
      doc.text(FinancialHelper.formatCurrency(Number(deal.finalAmount)), 480, y);
      
      y += 30;
      doc.fontSize(10);
      doc.text(`Amount in words: ${FinancialHelper.numberToWords(Number(deal.finalAmount))}`, itemX, y);
      
      y += 30;
      // Payment Details
      if (payments && payments.length > 0) {
        doc.text('Payment History:', itemX, y);
        y += 15;
        payments.forEach((payment, index) => {
          doc.text(`${index + 1}. ${payment.paymentMethod} - ${FinancialHelper.formatCurrency(Number(payment.amount))} on ${new Date(payment.paymentDate).toLocaleDateString('en-IN')}`, itemX + 10, y);
          y += 15;
        });
        y += 10;
      }
      
      const paymentStatus = FinancialHelper.getPaymentStatus(deal);
      doc.text(`Payment Status: ${paymentStatus.status}`, itemX, y);
      doc.text(`Amount Paid: ${FinancialHelper.formatCurrency(paymentStatus.totalPaid)}`, itemX + 200, y);
      y += 20;
      doc.text(`Balance Due: ${FinancialHelper.formatCurrency(paymentStatus.remainingAmount)}`, itemX, y);
      
      y += 40;
      doc.fontSize(8);
      doc.text('This is a computer generated invoice and does not require a signature.', itemX, y, { align: 'center' });
      
      doc.end();
    });
  }
}