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

// All classes overview (Sadhr Muallim)
router.get(
  "/classes",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.getAllClasses
);

// Create Class (Sadhr Muallim)
router.post(
  "/classes",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.createClass
);

// Get single Class by ID
router.get(
  "/classes/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.getClassById
);

// Update Class
router.patch(
  "/classes/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.updateClass
);

router.put(
  "/classes/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.updateClass
);

// Delete Class
router.delete(
  "/classes/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.deleteClass
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
  "/students",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.addStudent
);

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

// Export all active students as PDF
router.get(
  "/students/export/active",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.exportActiveStudents
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
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.deleteStudent
);

/**
 * Muallim (Teacher) Management Endpoints
 */

// Add / Register new Muallim
router.post(
  "/muallims",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.createMuallim
);

router.post(
  "/addMuallim",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.createMuallim
);

// Get all Muallims
router.get(
  "/muallims",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.getAllMuallims
);

// Get single Muallim by ID
router.get(
  "/muallims/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.getMuallimById
);

// Update Muallim details
router.patch(
  "/muallims/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.updateMuallim
);

router.put(
  "/muallims/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.updateMuallim
);

// Soft delete + archive Muallim
router.delete(
  "/muallims/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.deleteMuallim
);

/**
 * Parent & Guardian Management Endpoints
 */

// Register new Parent
router.post(
  "/parents",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.createParent
);

// Get all Parents
router.get(
  "/parents",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.getAllParents
);

// Export active parent login credential cards as PDF
router.get(
  "/parents/export",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.exportParentDetails
);

// Get single Parent by ID
router.get(
  "/parents/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.getParentById
);

// Update Parent
router.patch(
  "/parents/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.updateParent
);

router.put(
  "/parents/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.updateParent
);

// Soft delete + archive Parent
router.delete(
  "/parents/:id",
  requireAuth,
  requireRole(["SADHR_MUALLIM"]),
  sadhrController.deleteParent
);

export default router;
