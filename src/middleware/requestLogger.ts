import type { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Store original end function
  const originalEnd = res.end;
  let responseBody: any;

  // Override end function to capture response
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    if (chunk) {
      try {
        responseBody = JSON.parse(chunk.toString());
      } catch {
        responseBody = chunk.toString();
      }
    }
    return originalEnd.call(this, chunk, encoding, callback);
  };

  // Log after response is sent
  res.on('finish', () => {
    // Don't log every request - maybe just errors or specific endpoints
    if (res.statusCode >= 400 || req.method !== 'GET') {
      // You can add async logging here if needed
      console.log(`${req.method} ${req.url} - ${res.statusCode}`);
    }
  });

  next();
};