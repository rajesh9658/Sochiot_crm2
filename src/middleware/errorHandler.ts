import type { Request, Response, NextFunction } from "express";
import type { Prisma } from "../generated/client/client";
import { AppError } from "../utils/AppError";

type PrismaKnownRequestError = Prisma.PrismaClientKnownRequestError;

const isPrismaKnownRequestError = (
  error: unknown
): error is PrismaKnownRequestError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    "clientVersion" in error
  );
};

export const errorHandler = (
  err: Error | AppError | PrismaKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal server error";
  let error = err.message;

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Handle Prisma known errors
  if (isPrismaKnownRequestError(err)) {
    switch (err.code) {
      case "P2002":
        statusCode = 409;
        message = "Unique constraint violation";
        error = `The field ${err.meta?.target} already exists`;
        break;

      case "P2025":
        statusCode = 404;
        message = "Record not found";
        break;

      default:
        console.error("Prisma Error:", err);
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error : undefined,
    stack:
      process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
