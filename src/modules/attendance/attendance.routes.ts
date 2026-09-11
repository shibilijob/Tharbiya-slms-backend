import { Router } from "express";
import { attendanceController } from "./attendance.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Mark class attendance (Muallim & Sadhr Muallim) - supports both / and /mark
router.post(
  "/mark",
  requireAuth,
  requireRole(["MUALLIM", "SADHR_MUALLIM"]),
  attendanceController.markAttendance
);

router.post(
  "/",
  requireAuth,
  requireRole(["MUALLIM", "SADHR_MUALLIM"]),
  attendanceController.markAttendance
);

// Get attendance list (filtered by query params and user role)
router.get("/", requireAuth, attendanceController.getAttendanceList);

// Get class attendance for a specific date
router.get("/class/:classId", requireAuth, attendanceController.getClassAttendance);

// Get student attendance history (Accessible to Parents, Muallims, and Sadhr)
router.get("/student/:studentId", requireAuth, attendanceController.getStudentAttendance);

export default router;
