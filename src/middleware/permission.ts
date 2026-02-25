import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError';
import { RoleService } from '../services/role.service';

export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Super admin has all permissions
      if (req.user.isSuperAdmin) {
        return next();
      }

      const companyUser = await prisma.companyUser.findFirst({
        where: {
          userId: req.user.id,
          companyId: req.user.companyId!
        }
      });

      if (!companyUser) {
        throw new ForbiddenError('User not associated with company');
      }

      const hasPermission = await RoleService.checkUserPermission(
        companyUser.id,
        resource,
        action
      );

      if (!hasPermission) {
        throw new ForbiddenError(`Insufficient permissions to ${action} ${resource}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper to check multiple permissions
export const requireAnyPermission = (permissions: { resource: string; action: string }[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (req.user.isSuperAdmin) {
        return next();
      }

      const companyUser = await prisma.companyUser.findFirst({
        where: {
          userId: req.user.id,
          companyId: req.user.companyId!
        }
      });

      if (!companyUser) {
        throw new ForbiddenError('User not associated with company');
      }

      for (const { resource, action } of permissions) {
        const hasPermission = await RoleService.checkUserPermission(
          companyUser.id,
          resource,
          action
        );
        if (hasPermission) {
          return next();
        }
      }

      throw new ForbiddenError('Insufficient permissions');
    } catch (error) {
      next(error);
    }
  };
};
