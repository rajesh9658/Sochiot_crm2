import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { RoleService } from '../services/role.service';
import { BadRequestError, NotFoundError } from '../utils/AppError';

const queryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const getPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const permissions = await RoleService.getAllPermissions();
    
    // Group by resource
    const grouped = permissions.reduce((acc, p) => {
      if (!acc[p.resource]) {
        acc[p.resource] = [];
      }
      acc[p.resource]!.push(p);
      return acc;
    }, {} as Record<string, any[]>);

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0]?.msg || 'Validation failed');
    }

    const companyId = req.user!.companyId!;
    const { name, description, permissionIds } = req.body;

    const role = await RoleService.createRole(companyId, {
      name,
      description,
      permissionIds
    });

    res.status(201).json({
      success: true,
      data: role,
      message: 'Role created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const includeSystem = queryValue(req.query.includeSystem as string | string[] | undefined);

    const roles = await RoleService.getCompanyRoles(
      companyId,
      includeSystem !== 'false'
    );

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      throw new BadRequestError('Role id is required');
    }

    const role = await prisma.role.findFirst({
      where: {
        id: BigInt(id),
        companyId,
        deletedAt: null
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        users: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      throw new BadRequestError('Role id is required');
    }
    const { name, description, permissionIds } = req.body;

    const role = await RoleService.updateRole(companyId, BigInt(id), {
      name,
      description,
      permissionIds
    });

    res.json({
      success: true,
      data: role,
      message: 'Role updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      throw new BadRequestError('Role id is required');
    }

    const result = await RoleService.deleteRole(companyId, BigInt(id));

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const checkPermission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const resource = queryValue(req.query.resource as string | string[] | undefined);
    const action = queryValue(req.query.action as string | string[] | undefined);

    if (!resource || !action) {
      throw new BadRequestError('Resource and action are required');
    }

    // Get company user ID from authenticated user
    const companyUser = await prisma.companyUser.findFirst({
      where: {
        userId: req.user!.id,
        companyId: req.user!.companyId!
      }
    });

    if (!companyUser) {
      return res.json({
        success: true,
        data: { hasPermission: false }
      });
    }

    const hasPermission = await RoleService.checkUserPermission(
      companyUser.id,
      resource,
      action
    );

    res.json({
      success: true,
      data: { hasPermission }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyUser = await prisma.companyUser.findFirst({
      where: {
        userId: req.user!.id,
        companyId: req.user!.companyId!
      }
    });

    if (!companyUser) {
      return res.json({
        success: true,
        data: { permissions: [] }
      });
    }

    const permissions = await RoleService.getUserPermissions(companyUser.id);

    res.json({
      success: true,
      data: { permissions }
    });
  } catch (error) {
    next(error);
  }
};
