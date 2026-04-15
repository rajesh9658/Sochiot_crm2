import { prisma } from '../config/database';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/AppError';
import { AuditService } from './audit.service';
// import { Prisma } from '../generated/client';

export class CustomerService {
  
  // Generate unique customer code
  static async generateCustomerCode(companyId: bigint): Promise<string> {
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    const count = await prisma.customer.count({
      where: { companyId }
    });

    const companyCode = company?.name.substring(0, 3).toUpperCase().padEnd(3, 'X');
    return `${companyCode}${companyId}-CUST-${(count + 1).toString().padStart(5, '0')}`;
  }

  // Create customer
  static async createCustomer(
    companyId: bigint,
    userId: bigint,
    data: {
      customerCode?: string;
      categoryId: number;
      name: string;
      businessName?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      leadStatus?: string;
      leadSource?: string;
      assignedTo?: bigint;
      gstNumber?: string;
      panNumber?: string;
      creditLimit?: number;
      productInterests?: Array<{
        productCategory: string;
        productName?: string;
        quantityEstimate?: string;
        budgetRange?: string;
        interestLevel: string;
        notes?: string;
      }>;
    },
    req?: any
  ) {
    // Check category exists
    const category = await prisma.customerCategory.findFirst({
      where: {
        id: data.categoryId,
        companyId,
        deletedAt: null
      }
    });

    if (!category) {
      throw new NotFoundError('Customer category not found');
    }

    // Check assigned user if provided
    if (data.assignedTo) {
      const assignedUser = await prisma.companyUser.findFirst({
        where: {
          id: data.assignedTo,
          companyId,
          isActive: true
        }
      });

      if (!assignedUser) {
        throw new NotFoundError('Assigned user not found');
      }
    }

    // Generate customer code if not provided
    const customerCode = data.customerCode || await this.generateCustomerCode(companyId);

    // Check unique constraints
    const existing = await prisma.customer.findFirst({
      where: {
        companyId,
        OR: [
          { customerCode },
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : [])
        ],
        deletedAt: null
      }
    });

    if (existing) {
      if (existing.customerCode === customerCode) {
        throw new ConflictError('Customer code already exists');
      }
      if (existing.email === data.email) {
        throw new ConflictError('Customer with this email already exists');
      }
      if (existing.phone === data.phone) {
        throw new ConflictError('Customer with this phone already exists');
      }
    }

    // Create customer with product interests in transaction
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          companyId,
          customerCode,
          categoryId: data.categoryId,
          name: data.name,
          businessName: data.businessName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          leadStatus: (data.leadStatus as any) || 'NEW',
          leadSource: data.leadSource,
          assignedTo: data.assignedTo,
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          creditLimit: data.creditLimit || 0,
          isActive: true
        }
      });

      // Add product interests if provided
      if (data.productInterests && data.productInterests.length > 0) {
        await tx.productInterest.createMany({
          data: data.productInterests.map(pi => ({
            companyId,
            customerId: customer.id,
            productCategory: pi.productCategory,
            productName: pi.productName,
            quantityEstimate: pi.quantityEstimate,
            budgetRange: pi.budgetRange,
            interestLevel: pi.interestLevel as any,
            notes: pi.notes
          }))
        });
      }

      return customer;
    });

    // Audit log
    await AuditService.create(
      userId,
      companyId,
      'CUSTOMER',
      result.id,
      result,
      req
    );

    return result;
  }

  // Get customers with filters
  static async getCustomers(
    companyId: bigint,
    userId: bigint,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      leadStatus?: string;
      categoryId?: number;
      assignedTo?: bigint;
      city?: string;
      isActive?: boolean;
      startDate?: Date;
      endDate?: Date;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Get user's role and permissions
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    const where: any = {
      companyId,
      deletedAt: null
    };

    // Apply filters
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.leadStatus) {
      where.leadStatus = filters.leadStatus;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    // Assignment filter - managers see all, regular see only assigned
    if (!isManager && filters.assignedTo !== userId) {
      where.assignedTo = companyUser?.id;
    } else if (filters.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    // Search
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { customerCode: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Sorting
    let orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy = { createdAt: 'desc' };
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          category: true,
          assignedUser: {
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
          productInterests: {
            where: { deletedAt: null },
            take: 3
          },
          _count: {
            select: {
              activities: true,
              followups: {
                where: { status: 'PENDING' }
              },
              deals: {
                where: { deletedAt: null }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy
      }),
      prisma.customer.count({ where })
    ]);

    return {
      data: customers,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get customer by ID with full details
  static async getCustomerById(
    companyId: bigint,
    customerId: bigint,
    userId: bigint
  ) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
        deletedAt: null
      },
      include: {
        category: true,
        assignedUser: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        productInterests: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' }
        },
        activities: {
          take: 10,
          orderBy: { activityDate: 'desc' },
          include: {
            user: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            notes: {
              take: 3,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        followups: {
          where: { status: 'PENDING' },
          orderBy: { followupDate: 'asc' },
          include: {
            user: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        deals: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: {
            payments: {
              where: { deletedAt: null }
            }
          }
        },
        _count: {
          select: {
            activities: true,
            followups: true,
            deals: true
          }
        }
      }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check permission - managers can view all, others only assigned
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    if (!isManager && customer.assignedTo !== companyUser?.id) {
      throw new BadRequestError('You do not have permission to view this customer');
    }

    return customer;
  }

  // Update customer
  static async updateCustomer(
    companyId: bigint,
    userId: bigint,
    customerId: bigint,
    data: {
      categoryId?: number;
      name?: string;
      businessName?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      leadStatus?: string;
      leadSource?: string;
      assignedTo?: bigint | null;
      gstNumber?: string;
      panNumber?: string;
      creditLimit?: number;
      isActive?: boolean;
    },
    req?: any
  ) {
    // Get existing customer
    const existing = await prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
        deletedAt: null
      }
    });

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    // Check permission
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    if (!isManager && existing.assignedTo !== companyUser?.id) {
      throw new BadRequestError('You do not have permission to update this customer');
    }

    // Check category if updating
    if (data.categoryId) {
      const category = await prisma.customerCategory.findFirst({
        where: {
          id: data.categoryId,
          companyId,
          deletedAt: null
        }
      });

      if (!category) {
        throw new NotFoundError('Customer category not found');
      }
    }

    // Check assigned user if updating
    if (data.assignedTo) {
      const assignedUser = await prisma.companyUser.findFirst({
        where: {
          id: data.assignedTo,
          companyId,
          isActive: true
        }
      });

      if (!assignedUser) {
        throw new NotFoundError('Assigned user not found');
      }
    }

    // Check unique constraints for email/phone
    if (data.email && data.email !== existing.email) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          companyId,
          email: data.email,
          id: { not: customerId },
          deletedAt: null
        }
      });
      if (duplicate) {
        throw new ConflictError('Customer with this email already exists');
      }
    }

    if (data.phone && data.phone !== existing.phone) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          companyId,
          phone: data.phone,
          id: { not: customerId },
          deletedAt: null
        }
      });
      if (duplicate) {
        throw new ConflictError('Customer with this phone already exists');
      }
    }

    // Update customer
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        businessName: data.businessName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        leadStatus: data.leadStatus as any,
        leadSource: data.leadSource,
        assignedTo: data.assignedTo,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        creditLimit: data.creditLimit,
        isActive: data.isActive
      },
      include: {
        category: true,
        assignedUser: {
          include: {
            user: true
          }
        }
      }
    });

    // If lead status changed to CONVERTED, set convertedAt
    if (data.leadStatus === 'CONVERTED' && existing.leadStatus !== 'CONVERTED') {
      await prisma.customer.update({
        where: { id: customerId },
        data: { convertedAt: new Date() }
      });
    }

    // Audit log
    await AuditService.update(
      userId,
      companyId,
      'CUSTOMER',
      customerId,
      existing,
      updated,
      req
    );

    return updated;
  }

  // Delete customer (soft delete)
  static async deleteCustomer(
    companyId: bigint,
    userId: bigint,
    customerId: bigint,
    req?: any
  ) {
    const existing = await prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
        deletedAt: null
      },
      include: {
        deals: {
          where: { deletedAt: null }
        },
        activities: {
          where: { deletedAt: null },
          take: 1
        }
      }
    });

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    // Check if customer has active deals
    if (existing.deals.length > 0) {
      throw new BadRequestError('Cannot delete customer with active deals');
    }

    const deleted = await prisma.customer.update({
      where: { id: customerId },
      data: { deletedAt: new Date() }
    });

    await AuditService.delete(
      userId,
      companyId,
      'CUSTOMER',
      customerId,
      existing,
      req
    );

    return deleted;
  }

  // Bulk assign customers
  static async bulkAssign(
    companyId: bigint,
    userId: bigint,
    customerIds: bigint[],
    assignedTo: bigint,
    req?: any
  ) {
    // Check assigned user exists
    const assignedUser = await prisma.companyUser.findFirst({
      where: {
        id: assignedTo,
        companyId,
        isActive: true
      }
    });

    if (!assignedUser) {
      throw new NotFoundError('Assigned user not found');
    }

    // Check all customers exist
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        companyId,
        deletedAt: null
      }
    });

    if (customers.length !== customerIds.length) {
      throw new NotFoundError('One or more customers not found');
    }

    // Update all customers
    const result = await prisma.customer.updateMany({
      where: {
        id: { in: customerIds },
        companyId
      },
      data: { assignedTo }
    });

    await AuditService.create(
      userId,
      companyId,
      'BULK_ASSIGN',
      BigInt(customerIds.length),
      { customerIds, assignedTo },
      req
    );

    return {
      count: result.count,
      assignedTo,
      customerIds
    };
  }

  // Get customer statistics
  static async getCustomerStats(
    companyId: bigint,
    userId: bigint,
    dateRange?: { start: Date; end: Date }
  ) {
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId, companyId }
    });

    const isManager = companyUser?.systemRole === 'MANAGER' || 
                      companyUser?.systemRole === 'COMPANY_ADMIN';

    const where: any = {
      companyId,
      deletedAt: null
    };

    if (!isManager && companyUser) {
      where.assignedTo = companyUser.id;
    }

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    const [
      total,
      byStatus,
      byCategory,
      bySource,
      converted,
      lost
    ] = await Promise.all([
      prisma.customer.count({ where }),
      
      prisma.customer.groupBy({
        by: ['leadStatus'],
        where,
        _count: true
      }),
      
      prisma.customer.groupBy({
        by: ['categoryId'],
        where,
        _count: true,
        orderBy: { _count: { categoryId: 'desc' } },
        take: 5
      }),
      
      prisma.customer.groupBy({
        by: ['leadSource'],
        where: {
          ...where,
          leadSource: { not: null }
        },
        _count: true,
        orderBy: { _count: { leadSource: 'desc' } },
        take: 5
      }),
      
      prisma.customer.count({
        where: {
          ...where,
          leadStatus: 'CONVERTED'
        }
      }),
      
      prisma.customer.count({
        where: {
          ...where,
          leadStatus: 'LOST'
        }
      })
    ]);

    // Get category names
    const categoriesWithNames = await Promise.all(
      byCategory.map(async (item) => {
        const category = await prisma.customerCategory.findUnique({
          where: { id: item.categoryId }
        });
        return {
          categoryId: item.categoryId,
          categoryName: category?.name || 'Unknown',
          count: item._count
        };
      })
    );

    return {
      total,
      converted,
      lost,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      byStatus: byStatus.map(item => ({
        status: item.leadStatus,
        count: item._count
      })),
      byCategory: categoriesWithNames,
      bySource: bySource.map(item => ({
        source: item.leadSource,
        count: item._count
      }))
    };
  }
}