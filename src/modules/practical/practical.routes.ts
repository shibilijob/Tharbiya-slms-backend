import { Router } from "express";
import { practicalController } from "./practical.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Record practical and adab score (Muallim / Sadhr Muallim)
router.post(
  "/evaluate",
  requireAuth,
  requireRole(["MUALLIM", "SADHR_MUALLIM"]),
  practicalController.recordEvaluation
);

// Get student's practical history
router.get("/student/:studentId", requireAuth, practicalController.getStudentEvaluations);

// Get student's overall report card
router.get(
  "/student/:studentId/report",
  requireAuth,
  practicalController.getStudentPracticalReport
);

/**
 * Month-Wise Practical Scores Endpoints
 */
// Record / update single monthly practical score (Upsert)
router.post(
  "/scores",
  requireAuth,
  requireRole(["MUALLIM", "SADHR_MUALLIM"]),
  practicalController.recordMonthlyScore
);

// Bulk record monthly practical scores
router.post(
  "/scores/bulk",
  requireAuth,
  requireRole(["MUALLIM", "SADHR_MUALLIM"]),
  practicalController.recordBulkMonthlyScores
);

// Query monthly practical scores (classId, practicalSubjectId, month, year)
router.get(
  "/scores",
  requireAuth,
  requireRole(["MUALLIM", "SADHR_MUALLIM"]),
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

