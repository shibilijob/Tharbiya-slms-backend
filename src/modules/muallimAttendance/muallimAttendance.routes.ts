import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { muallimAttendanceController } from "./muallimAttendance.controller.js";

const router = Router();

// Strictly protect all muallim-attendance routes: SADHR_MUALLIM only
router.use(requireAuth);
router.use(requireRole(["SADHR_MUALLIM"]));

// Daily attendance
router.get("/", muallimAttendanceController.getDailyAttendance);
router.post("/bulk", muallimAttendanceController.saveBulkAttendance);

// Bulk Holiday actions
router.post("/shift-holiday", muallimAttendanceController.declareShiftHoliday);
router.post("/full-day-holiday", muallimAttendanceController.declareFullDayHoliday);

// Monthly report & PDF export
router.get("/monthly", muallimAttendanceController.getMonthlyReport);
router.get("/export-pdf", muallimAttendanceController.exportMonthlyPdf);

export default router;

