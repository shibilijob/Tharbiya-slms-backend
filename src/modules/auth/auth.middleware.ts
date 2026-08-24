import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  designation?: string;
  madrasaName?: string;
  assignedClasses?: string;
  assignedSubjects?: string;
  studentIds?: string;
  avatar?: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  session?: any;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session) {
      req.user = session.user as unknown as AuthenticatedUser;
      req.session = session.session;
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
  }
  next();
};

export const requireAuth = asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session || !session.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Please log in to continue.",
    });
  }

  req.user = session.user as unknown as AuthenticatedUser;
  req.session = session.session;
  next();
});

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please log in first.",
      });
    }

    const userRole = req.user.role || "PARENT";
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to perform this action.",
      });
    }

    next();
  };
};
