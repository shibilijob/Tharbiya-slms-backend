import { Router } from "express";
import { authController } from "./auth.controller.js";
import { requireAuth, requireRole } from "./auth.middleware.js";

const router = Router();

// ==========================================
// Authentication & Login Endpoints
// ==========================================

// 1. Universal role-aware login (identifier + password + optional role)
router.post("/login", authController.login);

// 2. Staff (Muallim & Sadhr Muallim) role-based login
router.post("/login/staff", authController.loginStaff);
router.post("/login/muallim", authController.loginStaff);
router.post("/login/sadhr", authController.loginStaff);

// 3. Dedicated Parent login (Mobile + PIN/Password)
router.post("/login/parent", authController.loginParent);

// 4. Muallim Only - Forgot Password & Brevo Email Verification Endpoints
router.post("/verify-muallim", authController.verifyMuallim);
router.post("/forgot-password/muallim", authController.sendMuallimPasswordResetEmail);
router.post("/forgot-password", authController.sendMuallimPasswordResetEmail);
router.post("/send-reset-email", authController.sendMuallimPasswordResetEmail);
router.post("/reset-password-token", authController.resetPasswordWithToken);
router.post("/reset-password/muallim", authController.resetPasswordWithToken);

// ==========================================
// Session & User Management Endpoints
// ==========================================

// Get current session user
router.get("/me", authController.getMe);

// Register a new user (Only Sadhr Muallim / Admin)
router.post(
  "/register",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  authController.register
);

// Get list of teachers and sadhr muallim
router.get("/faculty", authController.getFaculty);

export default router;
