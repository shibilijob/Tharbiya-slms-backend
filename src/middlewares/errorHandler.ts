import type { Request, Response, NextFunction } from "express";

/**
 * Centralized Express Error Handling Middleware
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Infer appropriate HTTP status codes for known authentication / permission errors if not explicitly set
  if (!err.statusCode) {
    if (
      message.includes("Invalid credentials") ||
      message.includes("Incorrect password") ||
      message.includes("Incorrect PIN") ||
      message.includes("inactive") ||
      message.includes("No Muallim account") ||
      message.includes("No Sadhr Muallim account") ||
      message.includes("No parent account") ||
      message.includes("User not found")
    ) {
      statusCode = 401;
    } else if (
      message.includes("Access restricted") ||
      message.includes("privileges required") ||
      message.includes("Forbidden")
    ) {
      statusCode = 403;
    } else if (message.includes("already exists")) {
      statusCode = 409;
    }
  }

  // Log 500 errors to console
  if (statusCode >= 500) {
    console.error("Unhandled Server Error:", err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
