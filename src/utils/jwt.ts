import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index';

export const generateToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN as '7d' | '1h' | '30d' | number | undefined) || '7d',
  });
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }

  return jwt.verify(token, secret) as JwtPayload;
};