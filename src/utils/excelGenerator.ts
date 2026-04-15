import ExcelJS from 'exceljs';
import { FinancialHelper } from './financialHelper';

export class ExcelGenerator {
  
  static async generateDealsReport(deals: any[], company: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Deals Report');
    
    // Add company header
    worksheet.mergeCells('A1:I1');
    worksheet.getCell('A1').value = company.name;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    
    worksheet.mergeCells('A2:I2');
    worksheet.getCell('A2').value = `Deals Report - Generated on ${new Date().toLocaleDateString('en-IN')}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    
    // Add headers
    const headers = [
      'Deal Number', 'Customer Name', 'Deal Date', 'Amount', 'Discount',
      'Tax', 'Final Amount', 'Status', 'Payment Status'
    ];
    
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add data
    for (const deal of deals) {
      const paymentStatus = FinancialHelper.getPaymentStatus(deal);
      
      worksheet.addRow([
        deal.dealNumber,
        deal.customer?.name || 'N/A',
        new Date(deal.dealDate).toLocaleDateString('en-IN'),
        FinancialHelper.formatCurrency(Number(deal.dealAmount)),
        FinancialHelper.formatCurrency(Number(deal.discountAmount)),
        FinancialHelper.formatCurrency(Number(deal.taxAmount)),
        FinancialHelper.formatCurrency(Number(deal.finalAmount)),
        deal.dealStatus,
        paymentStatus.status
      ]);
    }
    
    // Add totals row
    const totalRow = worksheet.addRow([
      'TOTAL', '', '',
      FinancialHelper.formatCurrency(deals.reduce((sum, d) => sum + Number(d.dealAmount), 0)),
      FinancialHelper.formatCurrency(deals.reduce((sum, d) => sum + Number(d.discountAmount), 0)),
      FinancialHelper.formatCurrency(deals.reduce((sum, d) => sum + Number(d.taxAmount), 0)),
      FinancialHelper.formatCurrency(deals.reduce((sum, d) => sum + Number(d.finalAmount), 0)),
      '', ''
    ]);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };
    });
    
    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
    
        // Fixed version
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);   // Convert Uint8Array/ArrayBuffer → Node Buffer
  }
  
  static async generatePaymentsReport(payments: any[], company: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments Report');
    
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = company.name;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    
    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `Payments Report - Generated on ${new Date().toLocaleDateString('en-IN')}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    
    const headers = [
      'Payment Number', 'Deal Number', 'Customer Name', 'Payment Date',
      'Amount', 'Method', 'Status', 'Collected By'
    ];
    
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' }
      };
    });
    
    for (const payment of payments) {
      worksheet.addRow([
        payment.paymentNumber,
        payment.deal?.dealNumber || 'N/A',
        payment.deal?.customer?.name || 'N/A',
        new Date(payment.paymentDate).toLocaleDateString('en-IN'),
        FinancialHelper.formatCurrency(Number(payment.amount)),
        payment.paymentMethod,
        payment.paymentStatus,
        payment.user?.user?.firstName + ' ' + payment.user?.user?.lastName || 'N/A'
      ]);
    }
    
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRow = worksheet.addRow([
      'TOTAL', '', '', '',
      FinancialHelper.formatCurrency(totalAmount), '', '', ''
    ]);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC8E6C9' }
      };
    });
    
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
    
    // Fixed version
        const buffer = await workbook.xlsx.writeBuffer();
     return Buffer.from(buffer);   // Convert Uint8Array/ArrayBuffer → Node Buffer
  }
}