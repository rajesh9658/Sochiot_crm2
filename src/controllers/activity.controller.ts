import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ActivityService } from '../services/activity.service';
import { BadRequestError } from '../utils/AppError';

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;

    const activity = await ActivityService.createActivity(
      companyId,
      userId,
      {
        userId: BigInt(req.body.userId),
        customerId: BigInt(req.body.customerId),
        activityType: req.body.activityType,
        activityDate: new Date(req.body.activityDate),
        durationMinutes: req.body.durationMinutes,
        purpose: req.body.purpose,
        outcome: req.body.outcome,
        locationLatitude: req.body.locationLatitude,
        locationLongitude: req.body.locationLongitude,
        locationAddress: req.body.locationAddress,
        nextFollowupDate: req.body.nextFollowupDate ? new Date(req.body.nextFollowupDate) : undefined,
        notes: req.body.notes
      },
      req
    );

    res.status(201).json({
      success: true,
      data: activity,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const {
      page, limit, customerId, activityType, outcome,
      assignedTo, startDate, endDate, sortBy, sortOrder
    } = req.query;

    const result = await ActivityService.getActivities(companyId, userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      customerId: customerId ? BigInt(customerId as string) : undefined,
      activityType: activityType as string,
      outcome: outcome as string,
      userId: assignedTo ? BigInt(assignedTo as string) : undefined,
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

export const getActivityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    const activity = await ActivityService.getActivityById(companyId, BigInt(id as string));

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    const activity = await ActivityService.updateActivity(
      companyId,
      userId,
      BigInt(id as string),
      {
        activityDate: req.body.activityDate ? new Date(req.body.activityDate) : undefined,
        durationMinutes: req.body.durationMinutes,
        purpose: req.body.purpose,
        outcome: req.body.outcome,
        locationLatitude: req.body.locationLatitude,
        locationLongitude: req.body.locationLongitude,
        locationAddress: req.body.locationAddress,
        nextFollowupDate: req.body.nextFollowupDate ? new Date(req.body.nextFollowupDate) : undefined
      },
      req
    );

    res.json({
      success: true,
      data: activity,
      message: 'Activity updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    await ActivityService.deleteActivity(companyId, userId, BigInt(id as string), req);

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const addActivityNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array()[0].msg);
    }

    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { id } = req.params;

    const note = await ActivityService.addActivityNote(
      companyId,
      userId,
      BigInt(id as string ),
      {
        note: req.body.note,
        isInternal: req.body.isInternal
      },
      req
    );

    res.status(201).json({
      success: true,
      data: note,
      message: 'Note added successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getActivityStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const stats = await ActivityService.getActivityStats(companyId, userId, {
      start: startDate ? new Date(startDate as string) : new Date(0),
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