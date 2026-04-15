import * as csv from 'csv-parse';
import * as fs from 'fs';
import { Readable } from 'stream';

export class CSVService {
  
  // Parse CSV buffer to JSON
  static async parseCSV(buffer: Buffer, hasHeaders: boolean = true): Promise<any[]> {
    return new Promise((resolve, reject) => {
      csv.parse(buffer, {
        columns: hasHeaders,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });
  }

  // Validate customer import data
  static validateCustomerRow(row: any): { valid: boolean; errors: string[] } {
    const errors = [];
    
    if (!row.name || row.name.trim() === '') {
      errors.push('Name is required');
    }
    
    if (row.email && !this.isValidEmail(row.email)) {
      errors.push('Invalid email format');
    }
    
    if (row.phone && !this.isValidPhone(row.phone)) {
      errors.push('Invalid phone number');
    }
    
    if (row.pincode && !this.isValidPincode(row.pincode)) {
      errors.push('Invalid pincode');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidPhone(phone: string): boolean {
    return /^[0-9]{10}$/.test(phone);
  }

  static isValidPincode(pincode: string): boolean {
    return /^[0-9]{6}$/.test(pincode);
  }

  // Generate CSV template
  static generateTemplate(): string {
    const headers = [
      'name*', 'businessName', 'phone', 'email', 'address', 'city', 'state', 'pincode',
      'leadStatus', 'leadSource', 'category', 'assignedToEmail', 'gstNumber', 'panNumber'
    ];
    
    const sampleRow = [
      'ABC Corporation', 'ABC Pvt Ltd', '9876543210', 'contact@abccorp.com',
      '123 Business Park', 'Mumbai', 'Maharashtra', '400001',
      'NEW', 'Website', 'General', 'sales@company.com', '27AAACA1234A1Z', 'AAAAA1234A'
    ];
    
    return [
      headers.join(','),
      sampleRow.map(cell => `"${cell}"`).join(',')
    ].join('\n');
  }
}