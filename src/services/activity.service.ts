import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/AppError';
import { AuditService } from './audit.service';
import { FollowupService } from './followup.service';
import { ActivityType, ActivityOutcome } from '../generated/client/client';
import { DateHelper } from '../utils/dateHelper';

export class ActivityService {
  
  static async createActivity(
    companyId: bigint,
    userId: bigint,
    data: {
      userId: bigint;
      customerId: bigint;
      activityType: string;
      activityDate: Date;
      durationMinutes?: number;
      purpose?: string;
      outcome?: string;
      locationLatitude?: number;
      locationLongitude?: number;
      locationAddress?: string;
      nextFollowupDate?: Date;
      notes?: Array<{
        note: string;
        isInternal?: boolean;
      }>;
    },
    req?: any
  ) {
    // Validate customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId, deletedAt: null }
    });
    if (!customer) throw new NotFoundError('Customer not found');

    // Validate user exists in company
    const companyUser = await prisma.companyUser.findFirst({
      where: { id: data.userId, companyId, isActive: true }
    });
    if (!companyUser) throw new NotFoundError('User not found in company');

    // Create activity with transaction
    const result = await prisma.$transaction(async (tx) => {
      const activity = await tx.activity.create({
        data: {
          companyId,
          userId: data.userId,
          customerId: data.customerId,
          activityType: data.activityType as ActivityType,
          activityDate: data.activityDate,
          durationMinutes: data.durationMinutes,
          purpose: data.purpose,
          outcome: (data.outcome as ActivityOutcome) || 'PENDING',
          locationLatitude: data.locationLatitude,
          locationLongitude: data.locationLongitude,
          locationAddress: data.locationAddress,
          nextFollowupDate: data.nextFollowupDate
        }
      });

      // Add notes if provided
      if (data.notes && data.notes.length > 0) {
        await tx.activityNote.createMany({
          data: data.notes.map(note => ({
            activityId: activity.id,
            userId: data.userId,
            note: note.note,
            isInternal: note.isInternal || false
          }))
        });
      }

      // Create followup if next date provided
      if (data.nextFollowupDate) {
        await FollowupService.createFollowup(
          companyId,
          userId,
          {
            activityId: activity.id,
            customerId: data.customerId,
            assignedTo: data.userId,
            followupDate: data.nextFollowupDate,
            followupType: 'CALL',
            priority: 'MEDIUM',
            subject: `Followup from ${data.activityType}`,
            description: data.purpose
          },
          req
        );
      }

      // Update customer lead status if outcome is successful
      if (data.outcome === 'SUCCESSFUL' && customer.leadStatus === 'NEW') {
        await tx.customer.update({
          where: { id: data.customerId },
          data: { leadStatus: 'CONTACTED' }
        });
      }

      return activity;
    });

    await AuditService.create(userId, companyId, 'ACTIVITY', result.id, result, req);
    return result;
  }

  static async getActivities(
    companyId: bigint,
    userId: bigint,
    filters: {
      page?: number;
      limit?: number;
      customerId?: bigint;
      activityType?: string;
      outcome?: string;
      userId?: bigint;
      startDate?: Date;
      endDate?: Date;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Get user's role
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    const where: any = { companyId, deletedAt: null };

    // Apply filters
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.activityType) where.activityType = filters.activityType;
    if (filters.outcome) where.outcome = filters.outcome;
    
    // User filter - managers see all, others see only their own
    if (!isManager && filters.userId !== userId) {
      where.userId = companyUser?.id;
    } else if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.activityDate = {};
      if (filters.startDate) where.activityDate.gte = filters.startDate;
      if (filters.endDate) where.activityDate.lte = filters.endDate;
    }

    // Sorting
    const sortField = filters.sortBy || 'activityDate';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: any = { [sortField]: sortOrder };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } }
          },
          customer: { select: { id: true, name: true, customerCode: true } },
          notes: {
            where: { deletedAt: null },
            include: { user: { include: { user: { select: { firstName: true, lastName: true } } } } },
            orderBy: { createdAt: 'desc' }
          },
          followups: {
            where: { deletedAt: null },
            take: 1
          }
        },
        skip,
        take: limit,
        orderBy
      }),
      prisma.activity.count({ where })
    ]);

    return { data: activities, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getActivityById(companyId: bigint, activityId: bigint) {
    const activity = await prisma.activity.findFirst({
      where: { id: activityId, companyId, deletedAt: null },
      include: {
        user: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
        },
        customer: { include: { category: true } },
        notes: {
          where: { deletedAt: null },
          include: { user: { include: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { createdAt: 'desc' }
        },
        followups: {
          where: { deletedAt: null },
          include: { user: { include: { user: { select: { firstName: true, lastName: true } } } } }
        }
      }
    });

    if (!activity) throw new NotFoundError('Activity not found');
    return activity;
  }

  static async updateActivity(
    companyId: bigint,
    userId: bigint,
    activityId: bigint,
    data: {
      activityDate?: Date;
      durationMinutes?: number;
      purpose?: string;
      outcome?: string;
      locationLatitude?: number;
      locationLongitude?: number;
      locationAddress?: string;
      nextFollowupDate?: Date;
    },
    req?: any
  ) {
    const existing = await prisma.activity.findFirst({
      where: { id: activityId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Activity not found');

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: {
        activityDate: data.activityDate,
        durationMinutes: data.durationMinutes,
        purpose: data.purpose,
        outcome: data.outcome as ActivityOutcome,
        locationLatitude: data.locationLatitude,
        locationLongitude: data.locationLongitude,
        locationAddress: data.locationAddress,
        nextFollowupDate: data.nextFollowupDate
      }
    });

    await AuditService.update(userId, companyId, 'ACTIVITY', activityId, existing, updated, req);
    return updated;
  }

  static async deleteActivity(companyId: bigint, userId: bigint, activityId: bigint, req?: any) {
    const existing = await prisma.activity.findFirst({
      where: { id: activityId, companyId, deletedAt: null }
    });
    if (!existing) throw new NotFoundError('Activity not found');

    const deleted = await prisma.activity.update({
      where: { id: activityId },
      data: { deletedAt: new Date() }
    });

    await AuditService.delete(userId, companyId, 'ACTIVITY', activityId, existing, req);
    return deleted;
  }

  static async addActivityNote(
    companyId: bigint,
    userId: bigint,
    activityId: bigint,
    data: { note: string; isInternal?: boolean },
    req?: any
  ) {
    const activity = await prisma.activity.findFirst({
      where: { id: activityId, companyId, deletedAt: null }
    });
    if (!activity) throw new NotFoundError('Activity not found');

    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId, isActive: true }
    });
    if (!companyUser) throw new NotFoundError('User not found');

    const note = await prisma.activityNote.create({
      data: {
        activityId,
        userId: companyUser.id,
        note: data.note,
        isInternal: data.isInternal || false
      },
      include: {
        user: { include: { user: { select: { firstName: true, lastName: true } } } }
      }
    });

    await AuditService.create(userId, companyId, 'ACTIVITY_NOTE', note.id, note, req);
    return note;
  }

  static async getActivityNotes(companyId: bigint, activityId: bigint, includeInternal: boolean = false) {
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId: includeInternal ? undefined : (await this.getCurrentUser(companyId))?.id }
    });

    const where: any = { activityId, deletedAt: null };
    if (!includeInternal) {
      where.isInternal = false;
    }

    return prisma.activityNote.findMany({
      where,
      include: {
        user: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getActivityStats(
    companyId: bigint,
    userId: bigint,
    dateRange?: { start: Date; end: Date }
  ) {
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    const where: any = { companyId, deletedAt: null };
    
    if (!isManager && companyUser) {
      where.userId = companyUser.id;
    }

    if (dateRange) {
      where.activityDate = { gte: dateRange.start, lte: dateRange.end };
    }

    const [
      total,
      byType,
      byOutcome,
      todayCount,
      weeklyAvg
    ] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.groupBy({ by: ['activityType'], where, _count: true }),
      prisma.activity.groupBy({ by: ['outcome'], where, _count: true }),
      prisma.activity.count({
        where: {
          ...where,
          activityDate: { gte: DateHelper.startOfDay(new Date()) }
        }
      }),
      prisma.activity.count({
        where: {
          ...where,
          activityDate: { gte: DateHelper.getWeekRange().start }
        }
      })
    ]);

    return {
      total,
      today: todayCount,
      weeklyAverage: Math.round(weeklyAvg / 7),
      byType: byType.map(item => ({ type: item.activityType, count: item._count })),
      byOutcome: byOutcome.map(item => ({ outcome: item.outcome, count: item._count })),
      successRate: total > 0 ? (byOutcome.find(o => o.outcome === 'SUCCESSFUL')?._count || 0) / total * 100 : 0
    };
  }

  private static async getCurrentUser(companyId: bigint): Promise<any> {
    // This would be replaced with actual user context
    return null;
  }
}