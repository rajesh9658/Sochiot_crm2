import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/AppError';
import { prisma } from '../config/database';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Invalid token format');
    }
    const decoded = verifyToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: BigInt(decoded.userId) },
      include: {
        companyMemberships: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Attach user to request
    const companyId = user.companyMemberships[0]?.companyId ? Number(user.companyMemberships[0].companyId) : undefined;
    req.user = {
      id: Number(user.id),
      email: user.email,
      ...(companyId !== undefined && { companyId }),
      isSuperAdmin: user.isSuperAdmin,
      role: user.companyMemberships[0]?.systemRole || 'FIELD_SALES'
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid token'));
  }
};

export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isSuperAdmin) {
    return next(new UnauthorizedError('Super admin access required'));
  }
  next();
};

export const requireCompanyAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.companyId && !req.user?.isSuperAdmin) {
    return next(new UnauthorizedError('Company access required'));
  }
  next();
};