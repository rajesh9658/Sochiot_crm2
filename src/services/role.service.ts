import { prisma } from '../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/AppError';

export class RoleService {
  
  // Get all permissions
  static async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });
  }

  // Create custom role
  static async createRole(
    companyId: bigint,
    data: {
      name: string;
      description?: string;
      permissionIds: number[];
    }
  ) {
    // Check if role name already exists in company
    const existing = await prisma.role.findFirst({
      where: {
        companyId,
        name: data.name,
        deletedAt: null
      }
    });

    if (existing) {
      throw new ConflictError('Role with this name already exists');
    }

    // Verify permissions exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: data.permissionIds }
      }
    });

    if (permissions.length !== data.permissionIds.length) {
      throw new BadRequestError('Some permissions do not exist');
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        companyId,
        name: data.name,
        description: data.description ?? null,
        isSystem: false,
        permissions: {
          create: data.permissionIds.map(permissionId => ({
            permissionId
          }))
        }
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    return role;
  }

  // Get company roles
  static async getCompanyRoles(companyId: bigint, includeSystem: boolean = true) {
    return prisma.role.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(includeSystem ? {} : { isSystem: false })
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            users: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  // Update role
  static async updateRole(
    companyId: bigint,
    roleId: bigint,
    data: {
      name?: string;
      description?: string;
      permissionIds?: number[];
    }
  ) {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        companyId,
        deletedAt: null
      }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestError('Cannot modify system roles');
    }

    // Update permissions if provided
    if (data.permissionIds) {
      // Verify permissions exist
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: data.permissionIds }
        }
      });

      if (permissions.length !== data.permissionIds.length) {
        throw new BadRequestError('Some permissions do not exist');
      }

      // Delete old permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId }
      });

      // Add new permissions
      await prisma.rolePermission.createMany({
        data: data.permissionIds.map(permissionId => ({
          roleId,
          permissionId
        }))
      });
    }

    // Update role details
    const updated = await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description })
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    return updated;
  }

  // Delete role (soft delete)
  static async deleteRole(companyId: bigint, roleId: bigint) {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        companyId,
        deletedAt: null
      },
      include: {
        users: {
          where: { isActive: true }
        }
      }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestError('Cannot delete system roles');
    }

    if (role.users.length > 0) {
      throw new BadRequestError('Cannot delete role assigned to users');
    }

    // Soft delete
    await prisma.role.update({
      where: { id: roleId },
      data: { deletedAt: new Date() }
    });

    return { message: 'Role deleted successfully' };
  }

  // Check user permission
  static async checkUserPermission(
    companyUserId: bigint,
    resource: string,
    action: string
  ): Promise<boolean> {
    const companyUser = await prisma.companyUser.findUnique({
      where: { id: companyUserId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!companyUser) {
      return false;
    }

    // Company admin has all permissions
    if (companyUser.systemRole === 'COMPANY_ADMIN') {
      return true;
    }

    // Check custom role permissions
    if (companyUser.role) {
      return companyUser.role.permissions.some(
        rp => rp.permission.resource === resource && 
              (rp.permission.action === action || rp.permission.action === 'manage')
      );
    }

    // Check system role permissions (simplified - in real app, have a permission matrix)
    const systemRolePermissions: Record<string, string[]> = {
      MANAGER: ['customer:read', 'customer:write', 'deal:read', 'deal:write', 'report:read'],
      FIELD_SALES: ['customer:read', 'customer:write', 'deal:read', 'deal:write'],
      SALES_EXECUTIVE: ['customer:read', 'deal:read']
    };

    const permissionKey = `${resource}:${action}`;
    const rolePermissions = systemRolePermissions[companyUser.systemRole];
    return rolePermissions ? rolePermissions.includes(permissionKey) : false;
  }

  // Get user permissions
  static async getUserPermissions(companyUserId: bigint) {
    const companyUser = await prisma.companyUser.findUnique({
      where: { id: companyUserId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!companyUser) {
      return [];
    }

    if (companyUser.systemRole === 'COMPANY_ADMIN') {
      // Return all permissions for admin
      const allPermissions = await prisma.permission.findMany();
      return allPermissions.map(p => `${p.resource}:${p.action}`);
    }

    const permissions: string[] = [];

    // Add custom role permissions
    if (companyUser.role) {
      permissions.push(
        ...companyUser.role.permissions.map(rp => 
          `${rp.permission.resource}:${rp.permission.action}`
        )
      );
    }

    // Add system role permissions
    const systemRolePermissions: Record<string, string[]> = {
      MANAGER: ['customer:read', 'customer:write', 'deal:read', 'deal:write', 'report:read'],
      FIELD_SALES: ['customer:read', 'customer:write', 'deal:read', 'deal:write'],
      SALES_EXECUTIVE: ['customer:read', 'deal:read']
    };

    const rolePermissions = systemRolePermissions[companyUser.systemRole];
    if (rolePermissions) {
      permissions.push(...rolePermissions);
    }

    return [...new Set(permissions)]; // Remove duplicates
  }
}
