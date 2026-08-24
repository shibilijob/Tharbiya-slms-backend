import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { hifzService } from "./hifz.service.js";
import { validateRecordHifzInput } from "./hifz.validators.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class HifzController {
  /**
   * Log student's daily Quran / Hifz recitation
   */
  logProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateRecordHifzInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const teacherId = req.user?.id || "admin-system";
    const log = await hifzService.recordHifzLog(req.body, teacherId);
    return res.status(201).json({
      success: true,
      message: "Hifz entry recorded successfully",
      data: log,
    });
  });

  /**
   * Get student's Hifz log history
   */
  getStudentHifzHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentId = String(req.params.studentId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const history = await hifzService.getStudentHifzHistory(studentId, limit);
    return res.json({
      success: true,
      data: history,
    });
  });

  /**
   * Get student's overall Hifz summary
   */
  getStudentHifzSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentId = String(req.params.studentId);

    const summary = await hifzService.getStudentHifzSummary(studentId);
    return res.json({
      success: true,
      data: summary,
    });
  });
}

export const hifzController = new HifzController();

