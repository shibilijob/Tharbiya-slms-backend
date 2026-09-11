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

import User from "../../models/User.js";
import { Types } from "mongoose";

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    // 1. Check Better Auth session
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session && session.user) {
      const emailOrPhone = session.user.email || (session.user as any).phone;
      const dbUser = await User.findOne({
        $or: [
          ...(Types.ObjectId.isValid(session.user.id) ? [{ _id: new Types.ObjectId(session.user.id) }] : []),
          ...(emailOrPhone ? [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }] : []),
        ],
      });

      if (dbUser && dbUser.isActive) {
        req.user = {
          id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email || session.user.email || "",
          phone: dbUser.phone || (session.user as any).phone,
          role: dbUser.role || session.user.role,
          designation: dbUser.designation || undefined,
          assignedClasses: JSON.stringify(dbUser.assignedClasses || []),
          emailVerified: true,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        } as AuthenticatedUser;
        req.session = session.session;
        return next();
      }

      req.user = session.user as unknown as AuthenticatedUser;
      req.session = session.session;
      return next();
    }

    // 2. Check Bearer token or custom auth headers
    const authHeader = req.headers.authorization || (req.headers["x-auth-token"] as string);
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      let userId: string | null = null;

      if (token.startsWith("sess_")) {
        const parts = token.split("_");
        if (parts.length >= 2 && parts[1] && Types.ObjectId.isValid(parts[1])) {
          userId = parts[1];
        }
      } else if (Types.ObjectId.isValid(token)) {
        userId = token;
      }

      if (userId) {
        const user = await User.findById(userId);
        if (user && user.isActive) {
          req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email || "",
            phone: user.phone,
            role: user.role,
            designation: user.designation || undefined,
            assignedClasses: JSON.stringify(user.assignedClasses || []),
            emailVerified: true,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          } as AuthenticatedUser;
          req.session = { token, user: req.user };
        }
      }
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
  // 1. Check Better Auth session
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session && session.user) {
      const emailOrPhone = session.user.email || (session.user as any).phone;
      const dbUser = await User.findOne({
        $or: [
          ...(Types.ObjectId.isValid(session.user.id) ? [{ _id: new Types.ObjectId(session.user.id) }] : []),
          ...(emailOrPhone ? [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }] : []),
        ],
      });

      if (dbUser && dbUser.isActive) {
        req.user = {
          id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email || session.user.email || "",
          phone: dbUser.phone || (session.user as any).phone,
          role: dbUser.role || session.user.role,
          designation: dbUser.designation || undefined,
          assignedClasses: JSON.stringify(dbUser.assignedClasses || []),
          emailVerified: true,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        } as AuthenticatedUser;
        req.session = session.session;
        return next();
      }

      req.user = session.user as unknown as AuthenticatedUser;
      req.session = session.session;
      return next();
    }
  } catch {}

  // 2. Check Bearer token or custom auth headers
  const authHeader = req.headers.authorization || (req.headers["x-auth-token"] as string);
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    let userId: string | null = null;

    if (token.startsWith("sess_")) {
      const parts = token.split("_");
      if (parts.length >= 2 && parts[1] && Types.ObjectId.isValid(parts[1])) {
        userId = parts[1];
      }
    } else if (Types.ObjectId.isValid(token)) {
      userId = token;
    }

    if (userId) {
      const user = await User.findById(userId);
      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email || "",
          phone: user.phone,
          role: user.role,
          designation: user.designation || undefined,
          assignedClasses: JSON.stringify(user.assignedClasses || []),
          emailVerified: true,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        } as AuthenticatedUser;
        req.session = { token, user: req.user };
        return next();
      }
    }
  }

  return res.status(401).json({
    success: false,
    message: "Unauthorized: Please log in to continue.",
  });
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
