import { Router } from "express";
import { hifzController } from "./hifz.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Log daily Quran / Hifz recitation (Muallims & Sadhr Muallim)
router.post(
  "/log",
  requireAuth,
  requireRole(["TEACHER", "ADMIN", "MUALLIM", "SADHR_MUALLIM"]),
  hifzController.logProgress
);

// Get student's Hifz log history
router.get("/student/:studentId", requireAuth, hifzController.getStudentHifzHistory);

// Get student's overall Hifz summary
router.get("/student/:studentId/summary", requireAuth, hifzController.getStudentHifzSummary);

export default router;
