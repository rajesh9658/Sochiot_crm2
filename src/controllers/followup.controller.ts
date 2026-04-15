import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { FollowupService } from '../services/followup.service';
import { BadRequestError } from '../utils/AppError';

export const createFollowup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;

    const followup = await FollowupService.createFollowup(
      companyId,
      userId,
      {
        activityId: req.body.activityId ? BigInt(req.body.activityId) : undefined,
        customerId: BigInt(req.body.customerId),
        assignedTo: BigInt(req.body.assignedTo),
        followupDate: new Date(req.body.followupDate),
        followupType: req.body.followupType,
        priority: req.body.priority,
        subject: req.body.subject,
        description: req.body.description
      },
      req
    );

    res.status(201).json({
      success: true,
      data: followup,
      message: 'Follow-up created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const {
      page, limit, status, assignedTo, customerId,
      priority, startDate, endDate, overdue
    } = req.query;

    const result = await FollowupService.getFollowups(companyId, userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      assignedTo: assignedTo ? BigInt(assignedTo as string) : undefined,
      customerId: customerId ? BigInt(customerId as string) : undefined,
      priority: priority as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      overdue: overdue === 'true'
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

export const getFollowupById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    const followup = await FollowupService.getFollowupById(companyId, BigInt(id as string));

    res.json({
      success: true,
      data: followup
    });
  } catch (error) {
    next(error);
  }
};

export const updateFollowup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    const followup = await FollowupService.updateFollowup(
      companyId,
      userId,
      BigInt(id as string),
      {
        followupDate: req.body.followupDate ? new Date(req.body.followupDate) : undefined,
        followupType: req.body.followupType,
        priority: req.body.priority,
        subject: req.body.subject,
        description: req.body.description,
        assignedTo: req.body.assignedTo ? BigInt(req.body.assignedTo) : undefined
      },
      req
    );

    res.json({
      success: true,
      data: followup,
      message: 'Follow-up updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const completeFollowup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    const followup = await FollowupService.completeFollowup(
      companyId,
      userId,
      BigInt(id as string),
      {
        notes: req.body.notes,
        createActivity: req.body.createActivity,
        activityData: req.body.activityData
      },
      req
    );

    res.json({
      success: true,
      data: followup,
      message: 'Follow-up marked as completed'
    });
  } catch (error) {
    next(error);
  }
};

export const cancelFollowup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason } = req.body;

    const followup = await FollowupService.cancelFollowup(
      companyId,
      userId,
      BigInt(id as string),
      reason,
      req
    );

    res.json({
      success: true,
      data: followup,
      message: 'Follow-up cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowupStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;

    const stats = await FollowupService.getFollowupStats(companyId, userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};