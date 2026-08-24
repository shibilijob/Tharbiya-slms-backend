import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { practicalService } from "./practical.service.js";
import { validatePracticalEvaluationInput } from "./practical.validators.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class PracticalController {
  /**
   * Record practical & adab scores
   */
  recordEvaluation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validatePracticalEvaluationInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const evaluatedById = req.user?.id || "admin-system";
    const evaluation = await practicalService.recordEvaluation(req.body, evaluatedById);
    return res.status(201).json({
      success: true,
      message: "Practical evaluation saved successfully",
      data: evaluation,
    });
  });

  /**
   * Get student's practical evaluations history
   */
  getStudentEvaluations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentId = String(req.params.studentId);

    const evaluations = await practicalService.getStudentEvaluations(studentId);
    return res.json({
      success: true,
      data: evaluations,
    });
  });

  /**
   * Get student's practical score report breakdown
   */
  getStudentPracticalReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentId = String(req.params.studentId);

    const report = await practicalService.getStudentPracticalReport(studentId);
    return res.json({
      success: true,
      data: report,
    });
  });
}

export const practicalController = new PracticalController();

