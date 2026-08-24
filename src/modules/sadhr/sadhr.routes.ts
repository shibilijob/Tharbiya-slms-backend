import { Router } from "express";
import { sadhrController } from "./sadhr.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Sadhr executive stats (Sadhr Muallim / Admin only)
router.get(
  "/stats",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.getDashboardStats
);

// All classes overview (Sadhr Muallim & Teachers)
router.get(
  "/classes",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.getAllClasses
);

// Publish announcement (Sadhr Muallim only)
router.post(
  "/announcements",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.publishAnnouncement
);

// create student
router.post(
  "/addStudent",
  sadhrController.addStudent
);

// Get all students
router.get(
  "/students",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.getAllStudents
);

// Update student
router.patch(
  "/students/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.updateStudent
);

// Soft delete + archive student
router.delete(
  "/students/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM", "ADMIN"]),
  sadhrController.deleteStudent
);

/**
 * Muallim (Teacher) Management Endpoints
 */

// Add / Register new Muallim
router.post(
  "/muallims",
  requireAuth,
  requireRole(["SADHR_MUALLIM", "ADMIN"]),
  sadhrController.createMuallim
);

router.post(
  "/addMuallim",
  requireAuth,
  requireRole(["SADHR_MUALLIM", "ADMIN"]),
  sadhrController.createMuallim
);

// Get all Muallims
router.get(
  "/muallims",
  requireAuth,
  requireRole(["SADHR_MUALLIM", "ADMIN"]),
  sadhrController.getAllMuallims
);

// Get single Muallim by ID
router.get(
  "/muallims/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM", "ADMIN"]),
  sadhrController.getMuallimById
);

// Update Muallim details
router.patch(
  "/muallims/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM", "ADMIN"]),
  sadhrController.updateMuallim
);

router.put(
  "/muallims/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM", "ADMIN"]),
  sadhrController.updateMuallim
);

// Soft delete + archive Muallim
router.delete(
  "/muallims/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM", "ADMIN"]),
  sadhrController.deleteMuallim
);

export default router;
