import { Router } from "express";
import { hifzController } from "./hifz.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();
const facultyRoles = ["MUALLIM", "SADHR_MUALLIM"];

// =========================================================================
// 1. HIFZ TARGET ENDPOINTS
// =========================================================================

// Get targets (filtered by classId, academicYearId, isActive)
router.get("/targets", requireAuth, requireRole(facultyRoles), hifzController.getTargets);

// Get current active target for class
router.get(
  "/targets/active/:classId",
  requireAuth,
  requireRole(facultyRoles),
  hifzController.getActiveTargetForClass
);

// Get single target by ID
router.get("/targets/:id", requireAuth, requireRole(facultyRoles), hifzController.getTargetById);

// Create new target for class
router.post("/targets", requireAuth, requireRole(facultyRoles), hifzController.createTarget);

// Update target
router.patch("/targets/:id", requireAuth, requireRole(facultyRoles), hifzController.updateTarget);
router.put("/targets/:id", requireAuth, requireRole(facultyRoles), hifzController.updateTarget);

// Delete target
router.delete("/targets/:id", requireAuth, requireRole(facultyRoles), hifzController.deleteTarget);

// =========================================================================
// 2. HIFZ RECORD ENDPOINTS (STUDENT PERFORMANCE)
// =========================================================================

// Get records (filtered by targetId, classId, studentId, date)
router.get("/records", requireAuth, requireRole(facultyRoles), hifzController.getRecords);

// Get single record by ID
router.get("/records/:id", requireAuth, requireRole(facultyRoles), hifzController.getRecordById);

// Create / record student progress
router.post("/records", requireAuth, requireRole(facultyRoles), hifzController.createRecord);

// Update student record
router.patch("/records/:id", requireAuth, requireRole(facultyRoles), hifzController.updateRecord);
router.put("/records/:id", requireAuth, requireRole(facultyRoles), hifzController.updateRecord);

// Delete student record
router.delete("/records/:id", requireAuth, requireRole(facultyRoles), hifzController.deleteRecord);

// =========================================================================
// 3. STUDENT SUMMARY & HISTORY ENDPOINTS
// =========================================================================

// Get student's Hifz log history
router.get("/student/:studentId", requireAuth, hifzController.getStudentHifzHistory);

// Get student's overall Hifz summary
router.get("/student/:studentId/summary", requireAuth, hifzController.getStudentHifzSummary);

export default router;
