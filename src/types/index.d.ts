import { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: bigint;
      email: string;
      companyId?: bigint;
      role: string;
      isSuperAdmin: boolean;
    };
  }
}