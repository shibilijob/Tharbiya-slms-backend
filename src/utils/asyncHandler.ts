import type { Request, Response, NextFunction, RequestHandler } from "express";

export type AsyncRequestHandler<Req = Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Higher-order utility to wrap async express route handlers and controllers.
 * Eliminates the need for manual try-catch blocks by forwarding errors to next().
 */
export const asyncHandler = <Req = Request>(fn: AsyncRequestHandler<Req>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
};

export default asyncHandler;
