import { Router } from "express";
import { practicalController } from "./practical.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Record practical and adab score (Muallim / Sadhr Muallim)
router.post(
  "/evaluate",
  requireAuth,
  requireRole(["TEACHER", "ADMIN", "MUALLIM", "SADHR_MUALLIM"]),
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

export default router;
