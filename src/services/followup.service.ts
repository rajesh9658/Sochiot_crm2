import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/AppError';
import { AuditService } from './audit.service';
import { FollowupStatus, FollowupType, FollowupPriority } from '../generated/client/client';
import { DateHelper } from '../utils/dateHelper';
import { NotificationService } from './notification.service';

export class FollowupService {
  
  static async createFollowup(
    companyId: bigint,
    userId: bigint,
    data: {
      activityId?: bigint;
      customerId: bigint;
      assignedTo: bigint;
      followupDate: Date;
      followupType: string;
      priority: string;
      subject?: string;
      description?: string;
    },
    req?: any
  ) {
    // Validate customer
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId, deletedAt: null }
    });
    if (!customer) throw new NotFoundError('Customer not found');

    // Validate assigned user
    const assignedUser = await prisma.companyUser.findFirst({
      where: { id: data.assignedTo, companyId, isActive: true }
    });
    if (!assignedUser) throw new NotFoundError('Assigned user not found');

    // Validate activity if provided
    if (data.activityId) {
      const activity = await prisma.activity.findFirst({
        where: { id: data.activityId, companyId, deletedAt: null }
      });
      if (!activity) throw new NotFoundError('Activity not found');
    }

    const followup = await prisma.followup.create({
      data: {
        companyId,
        activityId: data.activityId,
        customerId: data.customerId,
        assignedTo: data.assignedTo,
        followupDate: data.followupDate,
        followupType: data.followupType as FollowupType,
        priority: data.priority as FollowupPriority,
        subject: data.subject,
        description: data.description,
        status: 'PENDING'
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        user: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } }
      }
    });

    // Send notification
    await NotificationService.sendFollowupAssigned(followup);

    await AuditService.create(userId, companyId, 'FOLLOWUP', followup.id, followup, req);
    return followup;
  }

  static async getFollowups(
    companyId: bigint,
    userId: bigint,
    filters: {
      page?: number;
      limit?: number;
      status?: string;
      assignedTo?: bigint;
      customerId?: bigint;
      priority?: string;
      startDate?: Date;
      endDate?: Date;
      overdue?: boolean;
    }
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    const where: any = { companyId, deletedAt: null };

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.customerId) where.customerId = filters.customerId;
    
    if (!isManager && filters.assignedTo !== userId) {
      where.assignedTo = companyUser?.id;
    } else if (filters.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    if (filters.startDate || filters.endDate) {
      where.followupDate = {};
      if (filters.startDate) where.followupDate.gte = filters.startDate;
      if (filters.endDate) where.followupDate.lte = filters.endDate;
    }

    if (filters.overdue) {
      where.followupDate = { ...where.followupDate, lt: new Date() };
      where.status = 'PENDING';
    }

    const [followups, total] = await Promise.all([
      prisma.followup.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, customerCode: true, phone: true, email: true } },
          user: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          activity: { select: { id: true, activityType: true, activityDate: true } }
        },
        orderBy: [
          { priority: 'asc' },
          { followupDate: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.followup.count({ where })
    ]);

    return { data: followups, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getFollowupById(companyId: bigint, followupId: bigint) {
    const followup = await prisma.followup.findFirst({
      where: { id: followupId, companyId, deletedAt: null },
      include: {
        customer: { include: { category: true } },
        user: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        activity: true
      }
    });

    if (!followup) throw new NotFoundError('Followup not found');
    return followup;
  }

  static async updateFollowup(
    companyId: bigint,
    userId: bigint,
    followupId: bigint,
    data: {
      followupDate?: Date;
      followupType?: string;
      priority?: string;
      subject?: string;
      description?: string;
      assignedTo?: bigint;
    },
    req?: any
  ) {
    const existing = await prisma.followup.findFirst({
      where: { id: followupId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Followup not found');

    if (data.assignedTo) {
      const assignedUser = await prisma.companyUser.findFirst({
        where: { id: data.assignedTo, companyId, isActive: true }
      });
      if (!assignedUser) throw new NotFoundError('Assigned user not found');
    }

    const updated = await prisma.followup.update({
      where: { id: followupId },
      data: {
        followupDate: data.followupDate,
        followupType: data.followupType as FollowupType,
        priority: data.priority as FollowupPriority,
        subject: data.subject,
        description: data.description,
        assignedTo: data.assignedTo,
        ...(data.followupDate && { status: 'RESCHEDULED' })
      }
    });

    await AuditService.update(userId, companyId, 'FOLLOWUP', followupId, existing, updated, req);
    return updated;
  }

  static async completeFollowup(
    companyId: bigint,
    userId: bigint,
    followupId: bigint,
    completionData?: {
      notes?: string;
      createActivity?: boolean;
      activityData?: any;
    },
    req?: any
  ) {
    const existing = await prisma.followup.findFirst({
      where: { id: followupId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Followup not found');

    const updated = await prisma.$transaction(async (tx) => {
      const followup = await tx.followup.update({
        where: { id: followupId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Create activity if requested
      if (completionData?.createActivity && completionData?.activityData) {
        await tx.activity.create({
          data: {
            companyId,
            userId: existing.assignedTo,
            customerId: existing.customerId,
            activityType: existing.followupType as any,
            activityDate: new Date(),
            purpose: completionData.activityData.purpose || existing.subject,
            outcome: completionData.activityData.outcome || 'SUCCESSFUL',
            notes: completionData.activityData.notes ? {
              create: {
                userId: existing.assignedTo,
                note: completionData.activityData.notes,
                isInternal: false
              }
            } : undefined
          }
        });
      }

      return followup;
    });

    await AuditService.update(userId, companyId, 'FOLLOWUP', followupId, existing, updated, req);
    return updated;
  }

  static async cancelFollowup(
    companyId: bigint,
    userId: bigint,
    followupId: bigint,
    reason?: string,
    req?: any
  ) {
    const existing = await prisma.followup.findFirst({
      where: { id: followupId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Followup not found');

    const updated = await prisma.followup.update({
      where: { id: followupId },
      data: {
        status: 'CANCELLED',
        description: reason ? `${existing.description}\nCancelled: ${reason}` : existing.description
      }
    });

    await AuditService.update(userId, companyId, 'FOLLOWUP', followupId, existing, updated, req);
    return updated;
  }

  static async getFollowupStats(companyId: bigint, userId: bigint) {
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    const where: any = { companyId, deletedAt: null };
    if (!isManager && companyUser) {
      where.assignedTo = companyUser.id;
    }

    const today = DateHelper.startOfDay(new Date());
    const weekStart = DateHelper.getWeekRange().start;

    const [
      total,
      pending,
      completed,
      overdue,
      todayDue,
      thisWeek,
      byPriority
    ] = await Promise.all([
      prisma.followup.count({ where }),
      prisma.followup.count({ where: { ...where, status: 'PENDING' } }),
      prisma.followup.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.followup.count({
        where: {
          ...where,
          status: 'PENDING',
          followupDate: { lt: new Date() }
        }
      }),
      prisma.followup.count({
        where: {
          ...where,
          status: 'PENDING',
          followupDate: { gte: today, lt: new Date(today.getTime() + 86400000) }
        }
      }),
      prisma.followup.count({
        where: {
          ...where,
          followupDate: { gte: weekStart }
        }
      }),
      prisma.followup.groupBy({
        by: ['priority'],
        where: { ...where, status: 'PENDING' },
        _count: true
      })
    ]);

    return {
      total,
      pending,
      completed,
      overdue,
      todayDue,
      thisWeek,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      byPriority: byPriority.map(item => ({ priority: item.priority, count: item._count }))
    };
  }
}