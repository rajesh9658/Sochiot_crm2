import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';

export interface CustomerImportRow {
  name: string;
  businessName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  leadStatus?: string;
  leadSource?: string;
  category?: string;
  assignedToEmail?: string;
  gstNumber?: string;
  panNumber?: string;
}

export class CSVHelper {
  
  static async parseCSV(buffer: Buffer): Promise<CustomerImportRow[]> {
    return new Promise((resolve, reject) => {
      parse(
        buffer,
        {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
          cast: true,
        },
        (err, records: any[]) => {   // Use any[] temporarily for safety
          if (err) {
            reject(err);
            return;
          }
          resolve(records as CustomerImportRow[]);
        }
      );
    });
  }

  static async generateCSV(data: any[], columns: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      stringify(data, {
        header: true,
        columns: columns
      }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });
  }

  static validateImportRow(row: CustomerImportRow): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!row.name || row.name.trim() === '') {
      errors.push('Name is required');
    }

    if (row.email && !this.isValidEmail(row.email)) {
      errors.push(`Invalid email format: ${row.email}`);
    }

    if (row.phone && !this.isValidPhone(row.phone)) {
      errors.push(`Invalid phone number: ${row.phone}`);
    }

    if (row.pincode && !this.isValidPincode(row.pincode)) {
      errors.push(`Invalid pincode: ${row.pincode}`);
    }

    if (row.gstNumber && !this.isValidGST(row.gstNumber)) {
      errors.push(`Invalid GST number: ${row.gstNumber}`);
    }

    if (row.panNumber && !this.isValidPAN(row.panNumber)) {
      errors.push(`Invalid PAN number: ${row.panNumber}`);
    }

    return {
      isValid: errors.length === 0,
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

  static isValidGST(gst: string): boolean {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
  }

  static isValidPAN(pan: string): boolean {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
  }

  static getCSVTemplate(): string {
    const headers = [
      'name*',
      'businessName',
      'phone',
      'email',
      'address',
      'city',
      'state',
      'pincode',
      'leadStatus',
      'leadSource',
      'category',
      'assignedToEmail',
      'gstNumber',
      'panNumber'
    ];

    const sampleRow = [
      'ABC Corporation',
      'ABC Pvt Ltd',
      '9876543210',
      'contact@abccorp.com',
      '123 Business Park, Andheri East',
      'Mumbai',
      'Maharashtra',
      '400001',
      'NEW',
      'Website',
      'General',
      'sales@company.com',
      '27AAACA1234A1Z',
      'AAAAA1234A'
    ];

    return [
      headers.join(','),
      sampleRow.map(cell => `"${cell}"`).join(',')
    ].join('\n');
  }

  static normalizeLeadStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'new': 'NEW',
      'contacted': 'CONTACTED',
      'qualified': 'QUALIFIED',
      'proposal': 'PROPOSAL',
      'negotiation': 'NEGOTIATION',
      'converted': 'CONVERTED',
      'lost': 'LOST',
      'on hold': 'ON_HOLD'
    };
    return statusMap[status?.toLowerCase()] || 'NEW';
  }

  static normalizeInterestLevel(level: string): string {
    const levelMap: Record<string, string> = {
      'low': 'LOW',
      'medium': 'MEDIUM',
      'high': 'HIGH'
    };
    return levelMap[level?.toLowerCase()] || 'MEDIUM';
  }
}