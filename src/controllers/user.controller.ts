import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { UserService } from '../services/user.service';
import { BadRequestError, NotFoundError } from '../utils/AppError';

const queryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const inviteUser = async (
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
    const {
      email,
      firstName,
      lastName,
      phone,
      roleId,
      systemRole,
      managerId,
      territory,
      joiningDate
    } = req.body;

    const companyUser = await UserService.inviteUser(
      companyId,
      req.user!.id,
      {
        email,
        firstName,
        lastName,
        ...(phone !== undefined && { phone }),
        ...(roleId ? { roleId: BigInt(roleId) } : {}),
        systemRole,
        ...(managerId ? { managerId: BigInt(managerId) } : {}),
        ...(territory !== undefined && { territory }),
        ...(joiningDate ? { joiningDate: new Date(joiningDate) } : {})
      }
    );

    res.status(201).json({
      success: true,
      data: companyUser,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;

    const user = await UserService.acceptInvitation(token, password);

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const managerId = queryValue(req.query.managerId as string | string[] | undefined);
    const includeInactive = queryValue(req.query.includeInactive as string | string[] | undefined);

    const where: { companyId: bigint; managerId?: bigint; isActive?: true } = { companyId };
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    if (managerId) {
      where.managerId = BigInt(managerId);
    }

    const team = await prisma.companyUser.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            status: true,
            lastLoginAt: true
          }
        },
        role: true,
        manager: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        _count: {
          select: {
            subordinates: true,
            assignedCustomers: {
              where: { isActive: true }
            },
            deals: {
              where: { deletedAt: null }
            },
            activities: {
              where: {
                activityDate: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
              }
            }
          }
        }
      },
      orderBy: [
        { systemRole: 'asc' },
        { user: { firstName: 'asc' } }
      ]
    });

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamHierarchy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const hierarchy = await UserService.getTeamHierarchy(companyId);

    // Build tree structure
    const buildTree = (items: any[], parentId: bigint | null = null): any[] => {
      return items
        .filter(item => item.managerId === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }));
    };

    const tree = buildTree(hierarchy);

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    if (!userId) {
      throw new BadRequestError('User id is required');
    }
    const {
      systemRole,
      roleId,
      managerId,
      territory,
      isActive
    } = req.body;

    const updated = await UserService.updateUserAssignment(
      companyId,
      BigInt(userId),
      {
        ...(systemRole !== undefined && { systemRole }),
        ...(roleId !== undefined && { roleId: roleId ? BigInt(roleId) : null }),
        ...(managerId !== undefined && { managerId: managerId ? BigInt(managerId) : null }),
        ...(territory !== undefined && { territory }),
        ...(isActive !== undefined && { isActive })
      }
    );

    res.json({
      success: true,
      data: updated,
      message: 'User updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getUserDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    if (!userId) {
      throw new BadRequestError('User id is required');
    }

    const user = await prisma.companyUser.findFirst({
      where: {
        companyId,
        userId: BigInt(userId)
      },
      include: {
        user: true,
        role: true,
        manager: {
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
        },
        subordinates: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        assignedCustomers: {
          where: { isActive: true },
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        activities: {
          take: 5,
          orderBy: { activityDate: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        deals: {
          where: { deletedAt: null },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const metrics = await UserService.getUserMetrics(
      companyId,
      BigInt(userId),
      today,
      tomorrow
    );

    res.json({
      success: true,
      data: {
        ...user,
        todayMetrics: metrics
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const startDate = queryValue(req.query.startDate as string | string[] | undefined);
    const endDate = queryValue(req.query.endDate as string | string[] | undefined);

    if (!userId || !startDate || !endDate) {
      throw new BadRequestError('User id, start date and end date are required');
    }

    const metrics = await UserService.getUserMetrics(
      companyId,
      BigInt(userId),
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
};

export const bulkInviteUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      throw new BadRequestError('Users array is required');
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[]
    };

    for (const userData of users) {
      try {
        const companyUser = await UserService.inviteUser(
          companyId,
          req.user!.id,
          {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            ...(userData.phone !== undefined && { phone: userData.phone }),
            systemRole: userData.systemRole || 'FIELD_SALES',
            ...(userData.managerId ? { managerId: BigInt(userData.managerId) } : {}),
            ...(userData.territory !== undefined && { territory: userData.territory }),
            ...(userData.joiningDate ? { joiningDate: new Date(userData.joiningDate) } : {})
          }
        );
        results.successful.push(companyUser);
      } catch (error: any) {
        results.failed.push({
          email: userData.email,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: results,
      message: `Successfully invited ${results.successful.length} users, ${results.failed.length} failed`
    });
  } catch (error) {
    next(error);
  }
};
