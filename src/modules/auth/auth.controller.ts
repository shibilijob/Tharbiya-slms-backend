import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { authService } from "./auth.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  validateLoginInput,
  validateStaffLoginInput,
  validateParentLoginInput,
  validateRegisterInput,
  validateVerifyMuallimInput,
  validateResetMuallimPasswordInput,
} from "./auth.validators.js";

export class AuthController {
  /**
   * Universal Login Handler
   * Accepts identifier (email/phone), password, and optional role
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const validation = validateLoginInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const result = await authService.login(req.body);
    return res.status(200).json(result);
  });

  /**
   * Unified Staff (Muallim & Sadhr Muallim) Login Handler
   * Performs validation and role-based access control for faculty members
   * POST /api/auth/login/staff, POST /api/auth/login/muallim, POST /api/auth/login/sadhr
   */
  loginStaff = asyncHandler(async (req: Request, res: Response) => {
    const validation = validateStaffLoginInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // Role-based expectation if endpoint or request specifies a role
    const expectedRole = req.path.includes("sadhr")
      ? "SADHR_MUALLIM"
      : req.path.includes("muallim")
      ? "MUALLIM"
      : req.body.role;

    const result = await authService.loginStaff(req.body, expectedRole);
    return res.status(200).json(result);
  });

  // Backward-compatible references
  loginMuallim = this.loginStaff;
  loginSadhrMuallim = this.loginStaff;

  /**
   * Dedicated Parent Login Handler
   * POST /api/auth/login/parent
   */
  loginParent = asyncHandler(async (req: Request, res: Response) => {
    const validation = validateParentLoginInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const result = await authService.loginParent(req.body);
    return res.status(200).json(result);
  });

  /**
   * Get current authenticated user session
   */
  getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "No active session found",
        user: null,
      });
    }

    return res.json({
      success: true,
      authenticated: true,
      user: req.user,
      session: req.session,
    });
  });

  /**
   * Register new user (Sadhr Muallim admin action)
   */
  register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateRegisterInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const existing = await authService.getUserByEmailOrPhone(req.body.email);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A user with this email or phone number already exists",
      });
    }

    const user = await authService.register(req.body);
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  });

  /**
   * Get all active teachers
   */
  getFaculty = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const faculty = await authService.getFaculty();
    return res.json({
      success: true,
      data: faculty,
    });
  });

  /**
   * Verify Muallim identity for forgot password (Email Only)
   * POST /api/auth/verify-muallim
   */
  verifyMuallim = asyncHandler(async (req: Request, res: Response) => {
    const validation = validateVerifyMuallimInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const email = (req.body.email || req.body.identifier)?.trim();
    const result = await authService.verifyMuallim(email);
    return res.status(200).json({
      success: true,
      message: "Muallim account verified successfully",
      data: result,
    });
  });

  /**
   * Send Password Reset Email via Better Auth & Brevo (Muallim Only)
   * POST /api/auth/forgot-password/muallim
   */
  sendMuallimPasswordResetEmail = asyncHandler(async (req: Request, res: Response) => {
    const validation = validateVerifyMuallimInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const email = (req.body.email || req.body.identifier)?.trim();
    const result = await authService.sendMuallimPasswordResetEmail(email);
    return res.status(200).json(result);
  });

  /**
   * Reset Password with Better Auth Token
   * POST /api/auth/reset-password-token
   */
  resetPasswordWithToken = asyncHandler(async (req: Request, res: Response) => {
    const { token, email, newPassword, confirmPassword } = req.body;
    if (!newPassword || newPassword.length < 5) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 5 characters long",
      });
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const result = await authService.resetPasswordWithToken({ token, email, newPassword });
    return res.status(200).json(result);
  });
}

export const authController = new AuthController();

