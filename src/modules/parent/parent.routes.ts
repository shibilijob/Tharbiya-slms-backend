import { Router } from "express";
import { parentController } from "./parent.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

/**
 * Parent Profile & Children List
 */
router.use(requireAuth, requireRole(["PARENT"]));

router.get("/profile", parentController.getParentProfile);
router.get("/children", parentController.getParentChildren);

/**
 * Child-specific endpoints (Guarded by parent ownership verification in service layer)
 */
router.get("/children/:studentId", parentController.getChildProfile);
router.get(
  "/children/:studentId/attendance",
  parentController.getChildAttendance
);
router.get("/children/:studentId/hifz", parentController.getChildHifz);
router.get(
  "/children/:studentId/practical",
  parentController.getChildPractical
);
router.get(
  "/children/:studentId/timetable",
  parentController.getChildTimetable
);
router.get(
  "/children/:studentId/achievements",
  parentController.getChildAchievements
);
router.get(
  "/children/:studentId/awards",
  parentController.getChildAchievements
);

export default router;
