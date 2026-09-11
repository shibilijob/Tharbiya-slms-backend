import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { attendanceService } from "./attendance.service.js";
import { parentService } from "../parent/parent.service.js";
import { getFirstDayOfCurrentMonthForAttendance } from "../parent/parent.service.js";
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
      records: result.records,
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
      records: attendance,
    });
  });

  /**
   * Get attendance list (by classId, date, studentId, or for user's assigned classes)
   */
  getAttendanceList = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const classId = req.query.classId as string | undefined;
    const dateStr = req.query.date as string | undefined;
    const studentId = req.query.studentId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await attendanceService.getAttendanceList({
      classId,
      date: dateStr,
      studentId,
      startDate,
      endDate,
      beforeDate: req.user?.role === "PARENT" ? getFirstDayOfCurrentMonthForAttendance() : undefined,
      userId: req.user?.id,
      role: req.user?.role,
    });

    return res.json({
      success: true,
      count: result.length,
      data: result,
      records: result,
    });
  });

  /**
   * Get attendance history and statistics for a student
   */
  getStudentAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentId = String(req.params.studentId);
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    if (req.user?.role === "PARENT") {
      const result = await parentService.getChildAttendance(
        req.user.id,
        studentId,
        startDate,
        endDate
      );

      return res.json({
        success: true,
        data: result,
        records: result.records,
        summary: result.summary,
      });
    }

    const result = await attendanceService.getStudentAttendance(studentId, startDate, endDate);
    return res.json({
      success: true,
      data: result,
      records: result.records,
      summary: result.summary,
    });
  });
}

export const attendanceController = new AttendanceController();
