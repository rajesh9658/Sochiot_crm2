import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/AppError';
import { GeolocationUtils } from '../utils/geolocation';

export const validateLocation = (req: Request, res: Response, next: NextFunction) => {
  const { locationLatitude, locationLongitude } = req.body;

  if (locationLatitude !== undefined || locationLongitude !== undefined) {
    if (!locationLatitude || !locationLongitude) {
      throw new BadRequestError('Both latitude and longitude are required for location tracking');
    }

    if (!GeolocationUtils.isValidCoordinate(locationLatitude, locationLongitude)) {
      throw new BadRequestError('Invalid coordinates');
    }
  }

  next();
};

export const validateVisitProximity = (customerLat: number, customerLng: number, maxRadius: number = 100) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { locationLatitude, locationLongitude } = req.body;

    if (!locationLatitude || !locationLongitude) {
      throw new BadRequestError('Location required for visit verification');
    }

    const isValid = GeolocationUtils.validateVisitRadius(
      customerLat,
      customerLng,
      locationLatitude,
      locationLongitude,
      maxRadius
    );

    if (!isValid) {
      throw new BadRequestError(`You must be within ${maxRadius} meters of the customer location to mark visit`);
    }

    next();
  };
};