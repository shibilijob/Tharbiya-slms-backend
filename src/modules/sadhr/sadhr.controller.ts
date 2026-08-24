import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { sadhrService } from "./sadhr.service.js";
import {
  validateAnnouncementInput,
  validateCreateMuallimInput,
  validateUpdateMuallimInput,
} from "./sadhr.validators.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class SadhrController {
  /**
   * Get overarching institution statistics
   */
  getDashboardStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const stats = await sadhrService.getExecutiveStats();
    return res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get all classes and assigned usthads
   */
  getAllClasses = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const classes = await sadhrService.getAllClassesWithTeachers();
    return res.json({
      success: true,
      data: classes,
    });
  });

  /**
   * Publish an institutional announcement
   */
  publishAnnouncement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateAnnouncementInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const createdById = req.user?.id || "sadhr-muallim";
    const announcement = await sadhrService.createAnnouncement(req.body, createdById);
    return res.status(201).json({
      success: true,
      message: "Announcement published successfully",
      data: announcement,
    });
  });


  /**
   * Add a new student
   */
  addStudent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const student = await sadhrService.createStudent(req.body);

    return res.status(201).json({
      success: true,
      message: "Student added successfully",
      data: student,
    });
  });

  /**
   * Get all students with pagination support (default limit: 20)
   */
  getAllStudents = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const search = req.query.search as string | undefined;
      const classId = req.query.classId as string | undefined;
      const status = req.query.status as string | undefined;

      const result = await sadhrService.getAllStudents({
        page,
        limit,
        search,
        classId,
        status,
      });

      return res.status(200).json({
        success: true,
        message: "Students fetched successfully",
        data: result.students,
        pagination: result.pagination,
      });
    }
  );

  /**
   * Update student details
   */
  updateStudent = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const id = String(req.params.id || "");

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Student ID is required",
        });
      }

      const student = await sadhrService.updateStudent(
        id,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Student updated successfully",
        data: student,
      });
    }
  );

  /**
   * Soft delete and archive student
   */
  deleteStudent = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const id = String(req.params.id || "");

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Student ID is required",
        });
      }

      const deletedBy = req.user?.id || "sadhr-muallim";

      const deletedStudent = await sadhrService.deleteStudent(
        id,
        deletedBy
      );

      return res.status(200).json({
        success: true,
        message: "Student deleted and archived successfully",
        data: deletedStudent,
      });
    }
  );

  /**
   * ==========================================
   * MUALLIM (TEACHER) CONTROLLER ENDPOINTS
   * ==========================================
   */

  /**
   * Add / Register a new Muallim (Usthad)
   */
  createMuallim = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateCreateMuallimInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const muallim = await sadhrService.createMuallim(req.body);

    return res.status(201).json({
      success: true,
      message: `Usthad ${muallim.name} added to faculty successfully`,
      data: muallim,
    });
  });

  /**
   * Get all active Muallims for Sadhr workspace
   */
  getAllMuallims = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const muallims = await sadhrService.getAllMuallims();

    return res.status(200).json({
      success: true,
      message: "Muallims fetched successfully",
      count: muallims.length,
      data: muallims,
    });
  });

  /**
   * Get single Muallim by ID
   */
  getMuallimById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Muallim ID is required",
      });
    }

    const muallim = await sadhrService.getMuallimById(id);

    return res.status(200).json({
      success: true,
      data: muallim,
    });
  });

  /**
   * Update Muallim details
   */
  updateMuallim = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Muallim ID is required",
      });
    }

    const validation = validateUpdateMuallimInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const updatedMuallim = await sadhrService.updateMuallim(id, req.body);

    return res.status(200).json({
      success: true,
      message: `Usthad ${updatedMuallim.name} updated successfully`,
      data: updatedMuallim,
    });
  });

  /**
   * Soft delete and archive Muallim
   */
  deleteMuallim = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Muallim ID is required",
      });
    }

    const deletedBy = req.user?.id || req.user?.name || "sadhr-muallim";
    const reason = req.body?.reason;

    const result = await sadhrService.deleteMuallim(id, deletedBy, reason);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.archivedRecord,
    });
  });
}

export const sadhrController = new SadhrController();


