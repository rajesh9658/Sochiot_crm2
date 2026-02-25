import { prisma } from '../config/database';
import type { Request } from 'express';

export class AuditService {
  
  static async log(
    data: {
      companyId?: bigint;
      userId?: bigint;
      targetUserId?: bigint;
      action: string;
      entityType: string;
      entityId?: bigint;
      oldValue?: any;
      newValue?: any;
      ipAddress?: string;
      userAgent?: string;
    },
    req?: Request
  ) {
    try {
      const createData: any = {
        action: data.action,
        entityType: data.entityType
      };
      if (data.companyId !== undefined) createData.companyId = data.companyId;
      if (data.userId !== undefined) createData.userId = data.userId;
      if (data.targetUserId !== undefined) createData.targetUserId = data.targetUserId;
      if (data.entityId !== undefined) createData.entityId = data.entityId;
      if (data.oldValue !== undefined) {
        createData.oldValue = JSON.parse(JSON.stringify(data.oldValue));
      }
      if (data.newValue !== undefined) {
        createData.newValue = JSON.parse(JSON.stringify(data.newValue));
      }
      const ipAddress = data.ipAddress || req?.ip;
      if (ipAddress !== undefined) createData.ipAddress = ipAddress;
      const userAgent = data.userAgent || req?.get('user-agent');
      if (userAgent !== undefined) createData.userAgent = userAgent;

      await prisma.auditLog.create({
        data: createData
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  // Specific log methods for common actions
  static async userAction(
    userId: bigint,
    companyId: bigint,
    action: string,
    entityType: string,
    entityId: bigint,
    changes?: { old: any; new: any },
    req?: Request
  ) {
    const payload = {
      companyId,
      userId,
      action,
      entityType,
      entityId,
      ...(changes?.old !== undefined && { oldValue: changes.old }),
      ...(changes?.new !== undefined && { newValue: changes.new }),
      ...(req?.ip && { ipAddress: req.ip }),
      ...(req?.get('user-agent') && { userAgent: req.get('user-agent') as string })
    };
    return this.log(payload, req);
  }

  static async login(userId: bigint, companyId?: bigint, req?: Request) {
    const payload = {
      ...(companyId !== undefined && { companyId }),
      userId,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: userId,
      ...(req?.ip && { ipAddress: req.ip }),
      ...(req?.get('user-agent') && { userAgent: req.get('user-agent') as string })
    };
    return this.log(payload, req);
  }

  static async create(
    userId: bigint,
    companyId: bigint,
    entityType: string,
    entityId: bigint,
    data: any,
    req?: Request
  ) {
    const payload = {
      companyId,
      userId,
      action: 'CREATE',
      entityType,
      entityId,
      newValue: data,
      ...(req?.ip && { ipAddress: req.ip }),
      ...(req?.get('user-agent') && { userAgent: req.get('user-agent') as string })
    };
    return this.log(payload, req);
  }

  static async update(
    userId: bigint,
    companyId: bigint,
    entityType: string,
    entityId: bigint,
    oldData: any,
    newData: any,
    req?: Request
  ) {
    const payload = {
      companyId,
      userId,
      action: 'UPDATE',
      entityType,
      entityId,
      oldValue: oldData,
      newValue: newData,
      ...(req?.ip && { ipAddress: req.ip }),
      ...(req?.get('user-agent') && { userAgent: req.get('user-agent') as string })
    };
    return this.log(payload, req);
  }

  static async delete(
    userId: bigint,
    companyId: bigint,
    entityType: string,
    entityId: bigint,
    data?: any,
    req?: Request
  ) {
    const payload = {
      companyId,
      userId,
      action: 'DELETE',
      entityType,
      entityId,
      ...(data !== undefined && { oldValue: data }),
      ...(req?.ip && { ipAddress: req.ip }),
      ...(req?.get('user-agent') && { userAgent: req.get('user-agent') as string })
    };
    return this.log(payload, req);
  }
}
