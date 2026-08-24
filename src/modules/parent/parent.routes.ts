import { Router } from "express";
import { parentController } from "./parent.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";

const router = Router();

/**
 * Parent Profile & Children List
 */
router.get("/profile", requireAuth, parentController.getParentProfile);
router.get("/children", requireAuth, parentController.getParentChildren);

/**
 * Child-specific endpoints (Guarded by parent ownership verification in service layer)
 */
router.get("/children/:studentId", requireAuth, parentController.getChildProfile);
router.get(
  "/children/:studentId/attendance",
  requireAuth,
  parentController.getChildAttendance
);
router.get("/children/:studentId/hifz", requireAuth, parentController.getChildHifz);
router.get(
  "/children/:studentId/practical",
  requireAuth,
  parentController.getChildPractical
);
router.get(
  "/children/:studentId/timetable",
  requireAuth,
  parentController.getChildTimetable
);
router.get(
  "/children/:studentId/achievements",
  requireAuth,
  parentController.getChildAchievements
);
router.get(
  "/children/:studentId/awards",
  requireAuth,
  parentController.getChildAchievements
);

export default router;
