import { Request, Response, NextFunction } from 'express';
import { body, validationResult, query, param } from 'express-validator';
import { CustomerService } from '../services/customer.service';
import { BadRequestError } from '../utils/AppError';
import { prisma } from '../config/database';
import { AuditService } from '../services/audit.service';

// Create customer
export const createCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;

    const customer = await CustomerService.createCustomer(
      companyId,
      userId,
      req.body,
      req
    );

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get customers with filters
export const getCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;

    const {
      page,
      limit,
      search,
      leadStatus,
      categoryId,
      assignedTo,
      city,
      isActive,
      startDate,
      endDate,
      sortBy,
      sortOrder
    } = req.query;

    const result = await CustomerService.getCustomers(companyId, userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      leadStatus: leadStatus as string,
      categoryId: categoryId ? parseInt(categoryId as string) : undefined,
      assignedTo: assignedTo ? BigInt(assignedTo as string) : undefined,
      city: city as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

// Get customer by ID
export const getCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const customerId = BigInt(req.params.id as string);

    const customer = await CustomerService.getCustomerById(
      companyId,
      customerId,
      userId
    );

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// Update customer
export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const customerId = BigInt(req.params.id as string);

    const customer = await CustomerService.updateCustomer(
      companyId,
      userId,
      customerId,
      req.body,
      req
    );

    res.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete customer
export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const customerId = BigInt(req.params.id as string);

    await CustomerService.deleteCustomer(
      companyId,
      userId,
      customerId,
      req
    );

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Bulk assign customers
export const bulkAssignCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { customerIds, assignedTo } = req.body;

    const result = await CustomerService.bulkAssign(
      companyId,
      userId,
      customerIds.map((id: string) => BigInt(id)),
      BigInt(assignedTo),
      req
    );

    res.json({
      success: true,
      data: result,
      message: `${result.count} customers assigned successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Get customer statistics
export const getCustomerStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const stats = await CustomerService.getCustomerStats(companyId, userId, {
      start: startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1)),
      end: endDate ? new Date(endDate as string) : new Date()
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Export customers to CSV
export const exportCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;

    const {
      search,
      leadStatus,
      categoryId,
      assignedTo,
      startDate,
      endDate
    } = req.query;

    // Get all customers matching filters (no pagination)
    const result = await CustomerService.getCustomers(companyId, userId, {
      page: 1,
      limit: 10000, // Large limit for export
      search: search as string,
      leadStatus: leadStatus as string,
      categoryId: categoryId ? parseInt(categoryId as string) : undefined,
      assignedTo: assignedTo ? BigInt(assignedTo as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    // Generate CSV
    const csvHeaders = [
      'Customer Code', 'Name', 'Business Name', 'Phone', 'Email',
      'Address', 'City', 'State', 'Pincode', 'Lead Status', 'Lead Source',
      'Category', 'Assigned To', 'Created At', 'Converted At'
    ];

    const csvRows = result.data.map(customer => [
      customer.customerCode,
      customer.name,
      customer.businessName || '',
      customer.phone || '',
      customer.email || '',
      customer.address || '',
      customer.city || '',
      customer.state || '',
      customer.pincode || '',
      customer.leadStatus,
      customer.leadSource || '',
      customer.category.name,
      customer.assignedUser?.user.firstName + ' ' + customer.assignedUser?.user.lastName || 'Unassigned',
      customer.createdAt.toISOString(),
      customer.convertedAt?.toISOString() || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=customers_${new Date().toISOString()}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

// Import customers from CSV
export const importCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { customers } = req.body;

    if (!Array.isArray(customers) || customers.length === 0) {
      throw new BadRequestError('Customers array is required');
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      total: customers.length
    };

    for (const customerData of customers) {
      try {
        // Find or create category
        let category = await prisma.customerCategory.findFirst({
          where: {
            companyId,
            name: customerData.category || 'General',
            deletedAt: null
          }
        });

        if (!category) {
          category = await prisma.customerCategory.create({
            data: {
              companyId,
              name: customerData.category || 'General'
            }
          });
        }

        // Find assigned user
        let assignedTo = undefined;
        if (customerData.assignedToEmail) {
          const companyUser = await prisma.companyUser.findFirst({
            where: {
              companyId,
              user: {
                email: customerData.assignedToEmail
              },
              isActive: true
            }
          });
          if (companyUser) {
            assignedTo = companyUser.id;
          }
        }

        const customer = await CustomerService.createCustomer(
          companyId,
          userId,
          {
            categoryId: category.id,
            name: customerData.name,
            businessName: customerData.businessName,
            phone: customerData.phone,
            email: customerData.email,
            address: customerData.address,
            city: customerData.city,
            state: customerData.state,
            pincode: customerData.pincode,
            leadStatus: customerData.leadStatus || 'NEW',
            leadSource: customerData.leadSource,
            assignedTo,
            gstNumber: customerData.gstNumber,
            panNumber: customerData.panNumber
          },
          req
        );

        results.successful.push(customer);
      } catch (error: any) {
        results.failed.push({
          data: customerData,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: results,
      message: `Successfully imported ${results.successful.length} customers, ${results.failed.length} failed`
    });
  } catch (error) {
    next(error);
  }
};

// Get customer timeline
export const getCustomerTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user!.companyId!;
    const customerId = BigInt(req.params.id as string);

    const [activities, followups, deals, payments] = await Promise.all([
      prisma.activity.findMany({
        where: {
          companyId,
          customerId,
          deletedAt: null
        },
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
        },
        orderBy: { activityDate: 'desc' },
        take: 20
      }),
      prisma.followup.findMany({
        where: {
          companyId,
          customerId,
          deletedAt: null
        },
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
        },
        orderBy: { followupDate: 'desc' },
        take: 10
      }),
      prisma.deal.findMany({
        where: {
          companyId,
          customerId,
          deletedAt: null
        },
        include: {
          payments: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.findMany({
        where: {
          companyId,
          deal: {
            customerId
          },
          deletedAt: null
        },
        include: {
          deal: true,
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
        },
        orderBy: { paymentDate: 'desc' },
        take: 20
      })
    ]);

    // Combine and sort all events
    const timeline = [
      ...activities.map(a => ({
        type: 'ACTIVITY',
        date: a.activityDate,
        data: a,
        title: `${a.activityType} - ${a.outcome}`,
        description: a.purpose
      })),
      ...followups.map(f => ({
        type: 'FOLLOWUP',
        date: f.followupDate,
        data: f,
        title: `${f.followupType} Followup`,
        description: f.subject,
        status: f.status
      })),
      ...deals.map(d => ({
        type: 'DEAL',
        date: d.createdAt,
        data: d,
        title: `Deal #${d.dealNumber}`,
        description: `Amount: ${d.finalAmount}`,
        status: d.dealStatus
      })),
      ...payments.map(p => ({
        type: 'PAYMENT',
        date: p.paymentDate,
        data: p,
        title: `Payment #${p.paymentNumber}`,
        description: `Amount: ${p.amount} - ${p.paymentMethod}`,
        status: p.paymentStatus
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    next(error);
  }
};
