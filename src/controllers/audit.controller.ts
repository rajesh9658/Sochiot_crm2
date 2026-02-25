import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

const queryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId;
    const isSuperAdmin = req.user!.isSuperAdmin;
    
    const page = Number(queryValue(req.query.page as string | string[] | undefined) ?? 1);
    const limit = Number(queryValue(req.query.limit as string | string[] | undefined) ?? 20);
    const userId = queryValue(req.query.userId as string | string[] | undefined);
    const entityType = queryValue(req.query.entityType as string | string[] | undefined);
    const entityId = queryValue(req.query.entityId as string | string[] | undefined);
    const action = queryValue(req.query.action as string | string[] | undefined);
    const startDate = queryValue(req.query.startDate as string | string[] | undefined);
    const endDate = queryValue(req.query.endDate as string | string[] | undefined);

    const skip = (page - 1) * limit;

    const where: any = {};

    // Super admin can see all, company admins see their company only
    if (!isSuperAdmin) {
      where.companyId = companyId;
    } else if (req.query.companyId) {
      const companyIdQuery = queryValue(req.query.companyId as string | string[] | undefined);
      if (companyIdQuery) {
        where.companyId = BigInt(companyIdQuery);
      }
    }

    if (userId) {
      where.userId = BigInt(userId);
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = BigInt(entityId);
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          targetUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          company: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getEntityHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const entityType = Array.isArray(req.params.entityType) ? req.params.entityType[0] : req.params.entityType;
    const entityId = Array.isArray(req.params.entityId) ? req.params.entityId[0] : req.params.entityId;
    const companyId = req.user!.companyId;
    if (!entityType || !entityId) {
      throw new Error('Entity type and entity id are required');
    }
    
    const where = {
      entityType,
      entityId: BigInt(entityId),
      ...(companyId !== undefined && { companyId })
    };

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

export const getUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const companyId = req.user!.companyId;
    if (!userId) {
      throw new Error('User id is required');
    }

    const {
      startDate,
      endDate,
      limit = 50
    } = req.query;

    const where: any = {
      companyId,
      userId: BigInt(userId)
    };

    if (startDate || endDate) {
      where.createdAt = {};
      const parsedStartDate = queryValue(startDate as string | string[] | undefined);
      if (parsedStartDate) {
        where.createdAt.gte = new Date(parsedStartDate);
      }
      const parsedEndDate = queryValue(endDate as string | string[] | undefined);
      if (parsedEndDate) {
        where.createdAt.lte = new Date(parsedEndDate);
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    // Group by date for chart
    const groupedByDate = logs.reduce((acc, log) => {
      const date = log.createdAt.toISOString().split('T')[0] as string;
      if (!acc[date]) {
        acc[date] = { count: 0, actions: {} };
      }
      const dayStats = acc[date];
      dayStats.count++;
      dayStats.actions[log.action] = (dayStats.actions[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, any>);

    res.json({
      success: true,
      data: {
        logs,
        summary: groupedByDate,
        totalCount: logs.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId;
    const isSuperAdmin = req.user!.isSuperAdmin;

    const where: any = {};
    
    if (!isSuperAdmin) {
      where.companyId = companyId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLogs,
      todayLogs,
      actionBreakdown,
      entityBreakdown,
      recentUsers
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      
      prisma.auditLog.count({
        where: {
          ...where,
          createdAt: { gte: today }
        }
      }),
      
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } }
      }),
      
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: true,
        orderBy: { _count: { entityType: 'desc' } }
      }),
      
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { not: null }
        },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 5
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalLogs,
        today: todayLogs,
        byAction: actionBreakdown,
        byEntity: entityBreakdown,
        topUsers: recentUsers
      }
    });
  } catch (error) {
    next(error);
  }
};
