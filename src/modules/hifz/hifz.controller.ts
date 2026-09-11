import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { hifzService } from "./hifz.service.js";
import {
  validateCreateHifzTargetInput,
  validateUpdateHifzTargetInput,
  validateCreateHifzRecordInput,
  validateUpdateHifzRecordInput,
} from "./hifz.validators.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class HifzController {
  // =========================================================================
  // HIFZ TARGET CONTROLLER METHODS
  // =========================================================================

  /**
   * Create a Hifz target for a class
   */
  createTarget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateCreateHifzTargetInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const teacherId = req.user?.id || "teacher-system";
    const target = await hifzService.createTarget(req.body, teacherId);
    return res.status(201).json({
      success: true,
      message: "Hifz target created successfully",
      data: target,
    });
  });

  /**
   * Get all Hifz targets scoped to teacher's assigned classes
   */
  getTargets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "teacher-system";
    const filters = {
      classId: req.query.classId as string | undefined,
      status: req.query.status as string | undefined,
      academicYearId: req.query.academicYearId as string | undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === "true" : undefined,
    };

    const targets = await hifzService.getTargets(filters, teacherId);
    return res.json({
      success: true,
      data: targets,
    });
  });

  /**
   * Get current active target for a class
   */
  getActiveTargetForClass = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "teacher-system";
    const classId = String(req.params.classId);

    const target = await hifzService.getActiveTargetForClass(classId, teacherId);
    return res.json({
      success: true,
      data: target,
    });
  });

  /**
   * Get single target by ID
   */
  getTargetById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "teacher-system";
    const targetId = String(req.params.id);
    const target = await hifzService.getTargetById(targetId, teacherId);
    return res.json({
      success: true,
      data: target,
    });
  });

  /**
   * Update an existing Hifz target
   */
  updateTarget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateUpdateHifzTargetInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const teacherId = req.user?.id || "teacher-system";
    const targetId = String(req.params.id);
    const target = await hifzService.updateTarget(targetId, req.body, teacherId);
    return res.json({
      success: true,
      message: "Hifz target updated successfully",
      data: target,
    });
  });

  /**
   * Delete a Hifz target
   */
  deleteTarget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "teacher-system";
    const targetId = String(req.params.id);
    const result = await hifzService.deleteTarget(targetId, teacherId);
    return res.json({
      success: true,
      message: result.message,
    });
  });

  // =========================================================================
  // HIFZ RECORD CONTROLLER METHODS (STUDENT PROGRESS)
  // =========================================================================

  /**
   * Create or upsert student Hifz progress record
   */
  createRecord = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateCreateHifzRecordInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const teacherId = req.user?.id || "teacher-system";
    const record = await hifzService.createRecord(req.body, teacherId);
    return res.status(201).json({
      success: true,
      message: "Hifz record saved successfully",
      data: record,
    });
  });

  /**
   * Get Hifz records with filters
   */
  getRecords = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "teacher-system";
    const filters = {
      targetId: req.query.targetId as string | undefined,
      classId: req.query.classId as string | undefined,
      studentId: req.query.studentId as string | undefined,
      date: req.query.date as string | undefined,
    };

    const records = await hifzService.getRecords(filters, teacherId);
    return res.json({
      success: true,
      data: records,
    });
  });

  /**
   * Get single Hifz record by ID
   */
  getRecordById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "teacher-system";
    const recordId = String(req.params.id);
    const record = await hifzService.getRecordById(recordId, teacherId);
    return res.json({
      success: true,
      data: record,
    });
  });

  /**
   * Update student Hifz record
   */
  updateRecord = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateUpdateHifzRecordInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const teacherId = req.user?.id || "teacher-system";
    const recordId = String(req.params.id);
    const record = await hifzService.updateRecord(recordId, req.body, teacherId);
    return res.json({
      success: true,
      message: "Hifz record updated successfully",
      data: record,
    });
  });

  /**
   * Delete student Hifz record
   */
  deleteRecord = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const teacherId = req.user?.id || "teacher-system";
    const recordId = String(req.params.id);
    const result = await hifzService.deleteRecord(recordId, teacherId);
    return res.json({
      success: true,
      message: result.message,
    });
  });

  // =========================================================================
  // STUDENT HISTORY, SUMMARY & LEGACY METHODS
  // =========================================================================

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
