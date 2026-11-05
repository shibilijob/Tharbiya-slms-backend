import { Router } from "express";
import { practicalController } from "./practical.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

const allowedRoles = ["MUALLIM", "SADHR_MUALLIM", "ADMIN", "SUPER_ADMIN"];

// Record practical and adab score (Muallim / Sadhr Muallim / Admin)
router.post(
  "/evaluate",
  requireAuth,
  requireRole(allowedRoles),
  practicalController.recordEvaluation
);

// Get student's practical history
router.get("/student/:studentId", requireAuth, requireRole(allowedRoles), practicalController.getStudentEvaluations);

// Get student's overall report card
router.get(
  "/student/:studentId/report",
  requireAuth,
  requireRole(allowedRoles),
  practicalController.getStudentPracticalReport
);

/**
 * Month-Wise Practical Scores Endpoints
 */
// Record / update single monthly practical score (Upsert)
router.post(
  "/scores",
  requireAuth,
  requireRole(allowedRoles),
  practicalController.recordMonthlyScore
);

// Bulk record monthly practical scores
router.post(
  "/scores/bulk",
  requireAuth,
  requireRole(allowedRoles),
  practicalController.recordBulkMonthlyScores
);

// Query monthly practical scores (classId, practicalSubjectId, month, year)
router.get(
  "/scores",
  requireAuth,
  requireRole(allowedRoles),
  practicalController.getMonthlyScores
);

// Get student's monthly history
router.get(
  "/scores/history",
  requireAuth,
  practicalController.getStudentMonthlyHistory
);
router.get(
  "/scores/student/:studentId/history",
  requireAuth,
  practicalController.getStudentMonthlyHistory
);

// Delete monthly practical score
router.delete(
  "/scores/:id",
  requireAuth,
  requireRole(["MUALLIM", "SADHR_MUALLIM"]),
  practicalController.deleteMonthlyScore
);

export default router;

