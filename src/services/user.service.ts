import { prisma } from '../config/database';
import { hashPassword } from '../utils/password';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/AppError';
import emailService from './email.service';
import crypto from 'crypto';

export class UserService {
  
  // Generate unique employee code
  static async generateEmployeeCode(companyId: bigint): Promise<string> {
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    const count = await prisma.companyUser.count({
      where: { companyId }
    });

    // Format: C001-EMP-0001 (Company code + sequential number)
    const companyCode = company?.name.substring(0, 3).toUpperCase().padEnd(3, 'X');
    return `${companyCode}${companyId}-EMP-${(count + 1).toString().padStart(4, '0')}`;
  }

  // Invite user to company
  static async inviteUser(
    companyId: bigint,
    inviterId: bigint,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      roleId?: bigint;
      systemRole: string;
      managerId?: bigint;
      territory?: string;
      joiningDate?: Date;
    }
  ) {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    let isNewUser = false;
    let tempPassword = '';

    // If user doesn't exist, create temporary user
    if (!user) {
      isNewUser = true;
      tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await hashPassword(tempPassword);

      user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone ?? null,
          status: 'PENDING_VERIFICATION',
          emailVerified: false,
          emailVerifyToken: crypto.randomBytes(32).toString('hex')
        }
      });
    }

    // Check if user already in company
    const existingMembership = await prisma.companyUser.findFirst({
      where: {
        companyId,
        userId: user.id
      }
    });

    if (existingMembership) {
      throw new ConflictError('User already exists in this company');
    }

    // Check company user limit
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { plan: true }
    });

    if (company && company.currentUsers >= company.plan.maxUsers) {
      throw new BadRequestError('Company has reached maximum user limit');
    }

    // Generate employee code
    const employeeCode = await this.generateEmployeeCode(companyId);

    // Create company user
    const companyUser = await prisma.companyUser.create({
      data: {
        companyId,
        userId: user.id,
        employeeCode,
        systemRole: data.systemRole as any,
        roleId: data.roleId ?? null,
        managerId: data.managerId ?? null,
        territory: data.territory ?? null,
        joiningDate: data.joiningDate || new Date(),
        isActive: true
      },
      include: {
        user: true,
        manager: {
          include: {
            user: true
          }
        }
      }
    });

    // Update company user count
    await prisma.company.update({
      where: { id: companyId },
      data: { currentUsers: { increment: 1 } }
    });

    // Send invitation email
    if (isNewUser) {
      await emailService.sendCompanyInvitation(
        data.email,
        company?.name || 'Company',
        tempPassword,
        user.emailVerifyToken!
      );
    } else {
      await emailService.sendExistingUserInvitation(
        data.email,
        company?.name || 'Company'
      );
    }

    return companyUser;
  }

  // Accept invitation
  static async acceptInvitation(token: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token }
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired invitation token');
    }

    const hashedPassword = await hashPassword(password);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifyToken: null
      }
    });

    return updatedUser;
  }

  // Get team hierarchy
  static async getTeamHierarchy(companyId: bigint, managerId?: bigint) {
    const where: any = { companyId, isActive: true };
    
    if (managerId) {
      where.managerId = managerId;
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
            status: true
          }
        },
        role: true,
        subordinates: {
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
        _count: {
          select: {
            subordinates: true,
            assignedCustomers: true,
            deals: true
          }
        }
      },
      orderBy: [
        { systemRole: 'asc' },
        { user: { firstName: 'asc' } }
      ]
    });

    return team;
  }

  // Update user role/manager
  static async updateUserAssignment(
    companyId: bigint,
    userId: bigint,
    data: {
      systemRole?: string;
      roleId?: bigint | null;
      managerId?: bigint | null;
      territory?: string;
      isActive?: boolean;
    }
  ) {
    const companyUser = await prisma.companyUser.findFirst({
      where: {
        companyId,
        userId
      }
    });

    if (!companyUser) {
      throw new NotFoundError('User not found in company');
    }

    // Prevent removing last company admin
    if (data.isActive === false && companyUser.systemRole === 'COMPANY_ADMIN') {
      const adminCount = await prisma.companyUser.count({
        where: {
          companyId,
          systemRole: 'COMPANY_ADMIN',
          isActive: true
        }
      });

      if (adminCount <= 1) {
        throw new BadRequestError('Cannot deactivate the last company admin');
      }
    }

    const updateData = {
      ...(data.systemRole !== undefined && { systemRole: data.systemRole }),
      ...(data.roleId !== undefined && { roleId: data.roleId }),
      ...(data.managerId !== undefined && { managerId: data.managerId }),
      ...(data.territory !== undefined && { territory: data.territory }),
      ...(data.isActive !== undefined && { isActive: data.isActive })
    };

    const updated = await prisma.companyUser.update({
      where: { id: companyUser.id },
      data: updateData as any,
      include: {
        user: true,
        manager: {
          include: { user: true }
        }
      }
    });

    return updated;
  }

  // Get user performance metrics
  static async getUserMetrics(
    companyId: bigint,
    userId: bigint,
    startDate: Date,
    endDate: Date
  ) {
    const [activities, deals, payments, followups, newCustomers] = await Promise.all([
      // Activity counts
      prisma.activity.groupBy({
        by: ['activityType'],
        where: {
          companyId,
          userId,
          activityDate: {
            gte: startDate,
            lte: endDate
          },
          deletedAt: null
        },
        _count: true
      }),

      // Deals created
      prisma.deal.aggregate({
        where: {
          companyId,
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          deletedAt: null
        },
        _count: true,
        _sum: {
          finalAmount: true
        }
      }),

      // Payments collected
      prisma.payment.aggregate({
        where: {
          companyId,
          collectedBy: userId,
          paymentDate: {
            gte: startDate,
            lte: endDate
          },
          deletedAt: null,
          paymentStatus: 'CLEARED'
        },
        _count: true,
        _sum: {
          amount: true
        }
      }),

      // Followups completed
      prisma.followup.count({
        where: {
          companyId,
          assignedTo: userId,
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
            lte: endDate
          },
          deletedAt: null
        }
      }),

      // New customers added
      prisma.customer.count({
        where: {
          companyId,
          assignedTo: userId,
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          deletedAt: null
        }
      })
    ]);

    // Get targets for this period
    const targets = await prisma.userTarget.findFirst({
      where: {
        companyId,
        userId,
        targetDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    return {
      activities: activities.reduce((acc, curr) => {
        acc[curr.activityType] = curr._count;
        return acc;
      }, {} as Record<string, number>),
      deals: {
        count: deals._count,
        totalAmount: deals._sum.finalAmount || 0
      },
      payments: {
        count: payments._count,
        totalAmount: payments._sum.amount || 0
      },
      followupsCompleted: followups,
      newCustomers: newCustomers,
      targets: targets || null
    };
  }
}
