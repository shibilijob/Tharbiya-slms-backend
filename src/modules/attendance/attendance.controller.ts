import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { attendanceService } from "./attendance.service.js";
import { validateMarkAttendanceInput } from "./attendance.validators.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class AttendanceController {
  /**
   * Mark or update daily attendance for a whole class
   */
  markAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateMarkAttendanceInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const markedById = req.user?.id || "admin-system";
    const result = await attendanceService.markClassAttendance(req.body, markedById);
    return res.json({
      success: true,
      message: "Attendance saved successfully",
      data: result,
    });
  });

  /**
   * Get attendance for a class on a specific date
   */
  getClassAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const classId = String(req.params.classId);
    const dateStr: string =
      typeof req.query.date === "string"
        ? req.query.date
        : (new Date().toISOString().split("T")[0] as string);

    const attendance = await attendanceService.getClassAttendanceByDate(classId, dateStr);
    return res.json({
      success: true,
      date: dateStr,
      data: attendance,
    });
  });

  /**
   * Get attendance history and statistics for a student
   */
  getStudentAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentId = String(req.params.studentId);
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await attendanceService.getStudentAttendance(studentId, startDate, endDate);
    return res.json({
      success: true,
      data: result,
    });
  });
}

export const attendanceController = new AttendanceController();

