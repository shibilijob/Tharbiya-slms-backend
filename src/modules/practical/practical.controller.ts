import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { practicalService } from "./practical.service.js";
import { practicalScoreService } from "./practicalScore.service.js";
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

  /**
   * Record or update a single monthly practical score (Upsert)
   */
  recordMonthlyScore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "";
    const score = await practicalScoreService.recordMonthlyScore(req.body, teacherId);

    return res.status(200).json({
      success: true,
      message: "Monthly practical score recorded successfully",
      data: score,
    });
  });

  /**
   * Bulk record monthly practical scores for a class
   */
  recordBulkMonthlyScores = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "";
    const scores = await practicalScoreService.recordBulkMonthlyScores(req.body, teacherId);

    return res.status(200).json({
      success: true,
      message: "Bulk monthly practical scores recorded successfully",
      data: scores,
    });
  });

  /**
   * Get monthly practical scores scoped to class, subject, month, year
   */
  getMonthlyScores = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "";
    const scores = await practicalScoreService.getMonthlyScores(req.query, teacherId);

    return res.json({
      success: true,
      data: scores,
    });
  });

  /**
   * Get student's monthly history across all months
   */
  getStudentMonthlyHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentId = String(req.query.studentId || req.params.studentId);
    const teacherId = req.user?.id || "";
    const history = await practicalScoreService.getStudentMonthlyHistory(studentId, teacherId);

    return res.json({
      success: true,
      data: history,
    });
  });

  /**
   * Delete a monthly practical score
   */
  deleteMonthlyScore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scoreId = String(req.params.id);
    const teacherId = req.user?.id || "";
    const result = await practicalScoreService.deleteMonthlyScore(scoreId, teacherId);

    return res.json({
      success: true,
      message: result.message,
    });
  });
}

export const practicalController = new PracticalController();


