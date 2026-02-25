import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/AppError';

// Ensures user can only access their own company's data
export const companyContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    // Super admin can bypass company context
    if (req.user.isSuperAdmin) {
      return next();
    }

    // If company ID in params, verify it matches user's company
    if (req.params.companyId) {
      const companyIdParam = Array.isArray(req.params.companyId)
        ? req.params.companyId[0]
        : req.params.companyId;
      if (!companyIdParam) {
        throw new ForbiddenError('Invalid company id');
      }
      const paramCompanyId = BigInt(companyIdParam);
      if (req.user.companyId === undefined || paramCompanyId !== req.user.companyId) {
        throw new ForbiddenError('Access to this company is forbidden');
      }
    }

    // For any request that modifies data, ensure company ID is set
    if (req.method !== 'GET') {
      // You can add company ID to the request body if needed
      req.body.companyId = req.user.companyId;
    }

    next();
  } catch (error) {
    next(error);
  }
};
