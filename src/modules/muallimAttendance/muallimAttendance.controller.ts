import type { Response } from "express";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { muallimAttendanceService } from "./muallimAttendance.service.js";
import { AppError } from "../../utils/AppError.js";

export class MuallimAttendanceController {
  /**
   * GET /api/institutional/muallim-attendance?date=YYYY-MM-DD
   * Retrieve all Muallim attendance records for the selected date
   */
  getDailyAttendance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const result = await muallimAttendanceService.getDailyAttendance(dateStr);
      return res.status(200).json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * POST /api/institutional/muallim-attendance/bulk
   * Save attendance for multiple Muallims and all three shifts for the selected date
   */
  saveBulkAttendance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { date, records } = req.body;
      if (!date || !Array.isArray(records)) {
        throw new AppError("Payload must include date and an array of records", 400);
      }

      const markedById = req.user?.id;
      if (!markedById) {
        throw new AppError("Authenticated user ID required", 401);
      }

      const result = await muallimAttendanceService.saveBulkAttendance(
        { date, records },
        markedById
      );

      return res.status(200).json({
        success: true,
        message: "Attendance saved successfully",
        data: result,
      });
    }
  );

  /**
   * POST /api/institutional/muallim-attendance/shift-holiday
   * Declare a selected shift as a holiday for all active Muallims
   */
  declareShiftHoliday = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { date, shiftId, remarks, holidayReason } = req.body;
      if (!date || !shiftId) {
        throw new AppError("Both date and shiftId are required", 400);
      }

      const markedById = req.user?.id;
      if (!markedById) {
        throw new AppError("Authenticated user ID required", 401);
      }

      const reason = holidayReason !== undefined ? holidayReason : remarks;

      const result = await muallimAttendanceService.declareShiftHoliday(
        date,
        shiftId,
        reason,
        markedById
      );

      return res.status(200).json({
        success: true,
        message: `Shift ${shiftId} marked as institutional holiday for all active Muallims`,
        data: result,
      });
    }
  );

  /**
   * POST /api/institutional/muallim-attendance/full-day-holiday
   * Declare all three shifts as holidays for all active Muallims
   */
  declareFullDayHoliday = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { date, remarks, holidayReason } = req.body;
      if (!date) {
        throw new AppError("Date is required", 400);
      }

      const markedById = req.user?.id;
      if (!markedById) {
        throw new AppError("Authenticated user ID required", 401);
      }

      const reason = holidayReason !== undefined ? holidayReason : remarks;

      const result = await muallimAttendanceService.declareFullDayHoliday(
        date,
        reason,
        markedById
      );

      return res.status(200).json({
        success: true,
        message: "All 3 shifts marked as institutional holiday for all active Muallims",
        data: result,
      });
    }
  );

  /**
   * GET /api/institutional/muallim-attendance/monthly?year=YYYY&month=MM
   * Retrieve monthly attendance data and summaries
   */
  getMonthlyReport = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const year = Number(req.query.year) || new Date().getFullYear();
      const month = Number(req.query.month) || new Date().getMonth() + 1;
      const userId = req.query.userId as string | undefined;

      const result = await muallimAttendanceService.getMonthlyReport(
        year,
        month,
        userId
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * GET /api/institutional/muallim-attendance/export-pdf?year=YYYY&month=MM&userId=...
   * Export A4 PDF monthly attendance register
   */
  exportMonthlyPdf = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const year = Number(req.query.year) || new Date().getFullYear();
      const month = Number(req.query.month) || new Date().getMonth() + 1;
      const userId = req.query.userId as string | undefined;

      const pdfBuffer = await muallimAttendanceService.exportMonthlyPdf(
        year,
        month,
        userId
      );

      const filename = userId
        ? `Muallim_Individual_Attendance_${year}_${month}.pdf`
        : `Muallim_Attendance_Register_${year}_${month}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      return res.status(200).send(pdfBuffer);
    }
  );
}

export const muallimAttendanceController = new MuallimAttendanceController();
export default muallimAttendanceController;

