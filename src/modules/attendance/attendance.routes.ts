import { Router } from "express";
import { attendanceController } from "./attendance.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

// Mark class attendance (Muallim & Sadhr Muallim)
router.post(
  "/mark",
  requireAuth,
  requireRole(["TEACHER", "ADMIN", "MUALLIM", "SADHR_MUALLIM"]),
  attendanceController.markAttendance
);

// Get class attendance for a specific date
router.get("/class/:classId", requireAuth, attendanceController.getClassAttendance);

// Get student attendance history (Accessible to Parents, Muallims, and Sadhr)
router.get("/student/:studentId", requireAuth, attendanceController.getStudentAttendance);

export default router;
