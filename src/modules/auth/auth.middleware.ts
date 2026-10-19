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
import { verifySessionToken } from "./sessionToken.js";

const resolveBearerUser = async (token: string): Promise<AuthenticatedUser | null> => {
  const userId = verifySessionToken(token);
  if (!userId) return null;
  const user = await User.findById(userId);
  if (!user || !user.isActive) return null;
  return {
    id: user._id.toString(), name: user.name, email: user.email || "", phone: user.phone,
    role: user.role, designation: user.designation || undefined,
    assignedClasses: JSON.stringify(user.assignedClasses || []), emailVerified: true,
    createdAt: user.createdAt, updatedAt: user.updatedAt,
  } as AuthenticatedUser;
};

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
          role: dbUser.role,
          designation: dbUser.designation || undefined,
          assignedClasses: JSON.stringify(dbUser.assignedClasses || []),
          emailVerified: true,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        } as AuthenticatedUser;
        req.session = session.session;
        return next();
      }

      // The Better Auth principal must also resolve to an active application user;
      // never trust its client-supplied role or fall back to an unlinked session.
      return next();
    }

    // 2. Check signed application bearer token. Never trust a client-supplied user ID.
    const authHeader = req.headers.authorization || (req.headers["x-auth-token"] as string);
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      const bearerUser = await resolveBearerUser(token);
      if (bearerUser) { req.user = bearerUser; req.session = { token, user: bearerUser }; }
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
          role: dbUser.role,
          designation: dbUser.designation || undefined,
          assignedClasses: JSON.stringify(dbUser.assignedClasses || []),
          emailVerified: true,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        } as AuthenticatedUser;
        req.session = session.session;
        return next();
      }

      // The Better Auth principal must also resolve to an active application user.
    }
  } catch {}

  // 2. Check signed application bearer token. Never trust a client-supplied user ID.
  const authHeader = req.headers.authorization || (req.headers["x-auth-token"] as string);
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const bearerUser = await resolveBearerUser(token);
    if (bearerUser) { req.user = bearerUser; req.session = { token, user: bearerUser }; return next(); }
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
