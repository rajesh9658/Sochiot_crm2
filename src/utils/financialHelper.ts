export class FinancialHelper {
  
  static calculateTax(amount: number, taxRate: number = 18): number {
    return (amount * taxRate) / 100;
  }

  static calculateDiscount(amount: number, discountPercent: number): number {
    return (amount * discountPercent) / 100;
  }

  static calculateFinalAmount(
    amount: number,
    discountPercent: number = 0,
    taxRate: number = 18
  ): {
    originalAmount: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    finalAmount: number;
  } {
    const discountAmount = this.calculateDiscount(amount, discountPercent);
    const taxableAmount = amount - discountAmount;
    const taxAmount = this.calculateTax(taxableAmount, taxRate);
    const finalAmount = taxableAmount + taxAmount;

    return {
      originalAmount: amount,
      discountAmount,
      taxableAmount,
      taxAmount,
      finalAmount
    };
  }

  static numberToWords(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : '');
    };

    if (num === 0) return 'Zero';

    let words = '';
    if (num >= 10000000) {
      words += convertLessThanThousand(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }
    if (num >= 100000) {
      words += convertLessThanThousand(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    if (num >= 1000) {
      words += convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    if (num > 0) {
      words += convertLessThanThousand(num);
    }

    return words.trim() + ' Rupees Only';
  }

  static formatCurrency(amount: number, currency: string = 'INR'): string {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(amount);
  }

  static generateDealNumber(companyId: bigint, count: number): string {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const sequential = (count + 1).toString().padStart(5, '0');
    return `DL-${companyId}-${year}${month}-${sequential}`;
  }

  static generatePaymentNumber(companyId: bigint, count: number): string {
    const year = new Date().getFullYear();
    const sequential = (count + 1).toString().padStart(6, '0');
    return `PAY-${companyId}-${year}-${sequential}`;
  }

  static calculateDueDate(createdAt: Date, paymentTerms: string): Date {
    const dueDate = new Date(createdAt);
    
    if (paymentTerms.includes('days')) {
      const days = parseInt(paymentTerms.match(/\d+/)?.[0] || '30');
      dueDate.setDate(dueDate.getDate() + days);
    } else if (paymentTerms.toLowerCase().includes('net')) {
      const days = parseInt(paymentTerms.match(/\d+/)?.[0] || '30');
      dueDate.setDate(dueDate.getDate() + days);
    } else {
      dueDate.setDate(dueDate.getDate() + 30); // Default 30 days
    }
    
    return dueDate;
  }

  static getPaymentStatus(deal: any): {
    status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
    totalPaid: number;
    remainingAmount: number;
    percentagePaid: number;
  } {
    const totalPaid = deal.payments?.reduce((sum: number, p: any) => 
      p.paymentStatus === 'CLEARED' ? sum + Number(p.amount) : sum, 0) || 0;
    
    const totalAmount = Number(deal.finalAmount);
    const remainingAmount = totalAmount - totalPaid;
    const percentagePaid = (totalPaid / totalAmount) * 100;

    let status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' = 'PENDING';
    
    if (totalPaid >= totalAmount) {
      status = 'PAID';
    } else if (totalPaid > 0) {
      status = 'PARTIAL';
    } else if (deal.expectedDeliveryDate && new Date() > deal.expectedDeliveryDate) {
      status = 'OVERDUE';
    }

    return { status, totalPaid, remainingAmount, percentagePaid };
  }
}