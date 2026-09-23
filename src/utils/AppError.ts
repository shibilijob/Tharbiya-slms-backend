/**
 * Custom AppError class for predictable, typed HTTP errors
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public data?: unknown;

  constructor(message: string, statusCode: number = 500, data?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.data = data;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
