import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/AppError';

// ========== Customer Categories ==========
export const createCategory = async (
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
    const { name, description } = req.body;

    // Check if category exists
    const existing = await prisma.customerCategory.findFirst({
      where: {
        companyId,
        name,
        deletedAt: null
      }
    });

    if (existing) {
      throw new ConflictError('Category with this name already exists');
    }

    const category = await prisma.customerCategory.create({
      data: {
        companyId,
        name,
        description
      }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const { includeInactive } = req.query;

    const where: { companyId: bigint; deletedAt?: null } = { companyId };
    if (includeInactive !== 'true') {
      where.deletedAt = null;
    }

    const categories = await prisma.customerCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            customers: {
              where: { deletedAt: null }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.customerCategory.findFirst({
      where: {
        id: Number(id),
        companyId,
        deletedAt: null
      }
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check name uniqueness if changing
    if (name && name !== category.name) {
      const existing = await prisma.customerCategory.findFirst({
        where: {
          companyId,
          name,
          deletedAt: null,
          id: { not: Number(id) }
        }
      });

      if (existing) {
        throw new ConflictError('Category with this name already exists');
      }
    }

    const updated = await prisma.customerCategory.update({
      where: { id: Number(id) },
      data: { name, description }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    // Check if category has customers
    const category = await prisma.customerCategory.findFirst({
      where: {
        id: Number(id),
        companyId,
        deletedAt: null
      },
      include: {
        customers: {
          where: { deletedAt: null },
          take: 1
        }
      }
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (category.customers.length > 0) {
      throw new BadRequestError('Cannot delete category with assigned customers');
    }

    // Soft delete
    await prisma.customerCategory.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ========== Company Settings ==========
export const getCompanySettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        plan: true,
        customerCategories: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' }
        }
      }
    });

    // Get additional settings from a settings table if you have one
    // For now, return company details with defaults

    res.json({
      success: true,
      data: {
        company: {
          id: company?.id,
          name: company?.name,
          industry: company?.industry,
          phone: company?.phone,
          email: company?.email,
          address: company?.address,
          city: company?.city,
          state: company?.state,
          country: company?.country,
          subscriptionStatus: company?.subscriptionStatus,
          subscriptionEndsAt: company?.subscriptionEndsAt,
          currentUsers: company?.currentUsers,
          currentStorage: company?.currentStorage
        },
        plan: company?.plan,
        categories: company?.customerCategories,
        settings: {
          leadStages: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONVERTED', 'LOST'],
          activityTypes: ['CALL', 'VISIT', 'MEETING', 'EMAIL', 'WHATSAPP'],
          followupTypes: ['CALL', 'VISIT', 'MEETING', 'EMAIL'],
          paymentMethods: ['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI', 'CARD'],
          currencies: ['INR', 'USD']
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompanySettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const { 
      name, 
      industry, 
      phone, 
      email, 
      address, 
      city, 
      state, 
      country 
    } = req.body;

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        industry,
        phone,
        email,
        address,
        city,
        state,
        country
      }
    });

    res.json({
      success: true,
      data: company,
      message: 'Company settings updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ========== Territory Management ==========
export const getTerritories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;

    // Get unique territories from users
    const territories = await prisma.companyUser.findMany({
      where: {
        companyId,
        territory: { not: null },
        isActive: true
      },
      select: {
        territory: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      distinct: ['territory'],
      orderBy: { territory: 'asc' }
    });

    // Group by territory
    const territoryMap = territories.reduce((acc, curr) => {
      if (!curr.territory) return acc;
      
      const territory = curr.territory;
      if (!acc[territory]) {
        acc[territory] = [];
      }
      acc[territory]!.push(curr.user);
      return acc;
    }, {} as Record<string, any[]>);

    res.json({
      success: true,
      data: territoryMap
    });
  } catch (error) {
    next(error);
  }
};

// ========== Dashboard Stats ==========
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;

    // Get company user ID
    const companyUser = await prisma.companyUser.findFirst({
      where: {
        userId,
        companyId
      }
    });

    if (!companyUser) {
      throw new NotFoundError('User not found in company');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Different stats based on role
    const isManager = companyUser.systemRole === 'MANAGER' || companyUser.systemRole === 'COMPANY_ADMIN';
    
    let userFilter: any = {};
    if (!isManager) {
      // Regular users see only their own data
      userFilter = { userId: companyUser.id };
    }

    const [
      totalCustomers,
      todayActivities,
      pendingFollowups,
      weekFollowups,
      monthlyDeals,
      monthlyPayments,
      teamStats
    ] = await Promise.all([
      // Total customers
      prisma.customer.count({
        where: {
          companyId,
          ...(isManager ? {} : { assignedTo: companyUser.id }),
          deletedAt: null
        }
      }),

      // Today's activities
      prisma.activity.count({
        where: {
          companyId,
          ...userFilter,
          activityDate: {
            gte: today,
            lt: tomorrow
          },
          deletedAt: null
        }
      }),

      // Pending followups
      prisma.followup.count({
        where: {
          companyId,
          ...(isManager ? {} : { assignedTo: companyUser.id }),
          status: 'PENDING',
          followupDate: {
            gte: today
          },
          deletedAt: null
        }
      }),

      // This week's followups
      prisma.followup.count({
        where: {
          companyId,
          ...(isManager ? {} : { assignedTo: companyUser.id }),
          status: 'PENDING',
          followupDate: {
            gte: today,
            lt: nextWeek
          },
          deletedAt: null
        }
      }),

      // Monthly deals
      prisma.deal.aggregate({
        where: {
          companyId,
          ...(isManager ? {} : { userId: companyUser.id }),
          createdAt: {
            gte: monthStart
          },
          deletedAt: null
        },
        _count: true,
        _sum: {
          finalAmount: true
        }
      }),

      // Monthly payments
      prisma.payment.aggregate({
        where: {
          companyId,
          ...(isManager ? {} : { collectedBy: companyUser.id }),
          paymentDate: {
            gte: monthStart
          },
          deletedAt: null,
          paymentStatus: 'CLEARED'
        },
        _count: true,
        _sum: {
          amount: true
        }
      }),

      // Team stats for managers
      isManager ? prisma.companyUser.findMany({
        where: {
          companyId,
          isActive: true
        },
        select: {
          id: true,
          systemRole: true,
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              assignedCustomers: true,
              activities: {
                where: {
                  activityDate: {
                    gte: today,
                    lt: tomorrow
                  }
                }
              }
            }
          }
        },
        take: 5
      }) : null
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          todayActivities,
          pendingFollowups,
          weekFollowups
        },
        sales: {
          dealsCount: monthlyDeals._count,
          dealsAmount: monthlyDeals._sum.finalAmount || 0,
          paymentsCount: monthlyPayments._count,
          paymentsAmount: monthlyPayments._sum.amount || 0
        },
        ...(isManager && { topPerformers: teamStats })
      }
    });
  } catch (error) {
    next(error);
  }
};
