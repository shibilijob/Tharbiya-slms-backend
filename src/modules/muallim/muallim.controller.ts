import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { muallimService } from "./muallim.service.js";
import {
  validateMarkAttendanceInput,
  validateRecordHifzInput,
  validatePracticalEvaluationInput,
  validateCreatePracticalSubjectInput,
  validateUpdatePracticalSubjectInput,
  validateCreateSubjectInput,
  validateUpdateSubjectInput,
  validateCreateAchievementInput,
  validateCreatePeriodInput,
  validateUpdatePeriodInput,
} from "./muallim.validators.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class MuallimController {
  /**
   * =========================================================================
   * MUALLIM WORKSPACE & CLASSROOM HANDLERS
   * =========================================================================
   */

  /**
   * Get Muallim dashboard overview stats
   */
  getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const muallimId = req.user?.id || "";
    const stats = await muallimService.getMuallimDashboardStats(muallimId);

    return res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get all classes assigned to the authenticated Muallim
   */
  getAssignedClasses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const muallimId = req.user?.id || "";
    const classes = await muallimService.getAssignedClasses(muallimId);

    return res.json({
      success: true,
      data: classes,
    });
  });

  /**
   * Get students for a specific class
   */
  getClassStudents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const classId = String(req.params.classId || "");
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Class ID is required",
      });
    }

    const students = await muallimService.getClassStudents(classId);

    return res.json({
      success: true,
      count: students.length,
      data: students,
    });
  });

  /**
   * =========================================================================
   * ATTENDANCE HANDLERS
   * =========================================================================
   */

  /**
   * Mark or update daily attendance for a class
   */
  markAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateMarkAttendanceInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const markedById = req.user?.id || "teacher-system";
    const result = await muallimService.markClassAttendance(req.body, markedById);

    return res.json({
      success: true,
      message: "Attendance recorded successfully",
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

    const attendance = await muallimService.getClassAttendanceByDate(classId, dateStr);

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

    const result = await muallimService.getStudentAttendance(studentId, startDate, endDate);

    return res.json({
      success: true,
      data: result,
    });
  });

  /**
   * =========================================================================
   * HIFZ / QURAN RECITATION HANDLERS
   * =========================================================================
   */

  /**
   * Log student's daily Quran / Hifz recitation
   */
  logHifzProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateRecordHifzInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const teacherId = req.user?.id || "teacher-system";
    const log = await muallimService.recordHifzLog(req.body, teacherId);

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

    const history = await muallimService.getStudentHifzHistory(studentId, limit);

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
    const summary = await muallimService.getStudentHifzSummary(studentId);

    return res.json({
      success: true,
      data: summary,
    });
  });

  /**
   * =========================================================================
   * PRACTICAL & ADAB EVALUATION HANDLERS
   * =========================================================================
   */

  /**
   * Record practical & adab scores
   */
  recordPracticalEvaluation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validatePracticalEvaluationInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const evaluatedById = req.user?.id || "teacher-system";
    const evaluation = await muallimService.recordEvaluation(req.body, evaluatedById);

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
    const evaluations = await muallimService.getStudentEvaluations(studentId);

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
    const report = await muallimService.getStudentPracticalReport(studentId);

    return res.json({
      success: true,
      data: report,
    });
  });

  /**
   * =========================================================================
   * PRACTICAL SUBJECT MANAGEMENT HANDLERS
   * =========================================================================
   */

  /**
   * Add / Register a new practical subject for a class
   */
  addPracticalSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateCreatePracticalSubjectInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const practicalSubject = await muallimService.addPracticalSubject(req.body);

    return res.status(201).json({
      success: true,
      message: `Practical subject "${practicalSubject.name}" created successfully`,
      data: practicalSubject,
    });
  });

  /**
   * Get all active practical subjects (optionally filtered by class)
   */
  getPracticalSubjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const classId = (req.query.classId || req.params.classId) as string | undefined;
    const subjects = await muallimService.getPracticalSubjects(classId);

    return res.json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  });

  /**
   * Get single practical subject by ID
   */
  getPracticalSubjectById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Practical subject ID is required",
      });
    }

    const subject = await muallimService.getPracticalSubjectById(id);

    return res.json({
      success: true,
      data: subject,
    });
  });

  /**
   * Update practical subject details
   */
  updatePracticalSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Practical subject ID is required",
      });
    }

    const validation = validateUpdatePracticalSubjectInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const updated = await muallimService.updatePracticalSubject(id, req.body);

    return res.json({
      success: true,
      message: `Practical subject "${updated.name}" updated successfully`,
      data: updated,
    });
  });

  /**
   * Remove / Soft-delete practical subject
   */
  removePracticalSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Practical subject ID is required",
      });
    }

    const result = await muallimService.removePracticalSubject(id);

    return res.json({
      success: true,
      message: result.message,
      data: { id: result.deletedId },
    });
  });

  /**
   * =========================================================================
   * ACADEMIC SUBJECT MANAGEMENT HANDLERS (Add, Edit/Update, Remove)
   * =========================================================================
   */

  /**
   * Add / Register a new academic subject for a class
   */
  addSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateCreateSubjectInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const subject = await muallimService.addSubject(req.body);

    return res.status(201).json({
      success: true,
      message: `Subject "${subject.name}" created successfully`,
      data: subject,
    });
  });

  /**
   * Get all active academic subjects (optionally filtered by class)
   */
  getSubjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const classId = (req.query.classId || req.params.classId) as string | undefined;
    const subjects = await muallimService.getSubjects(classId);

    return res.json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  });

  /**
   * Get single academic subject by ID
   */
  getSubjectById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Subject ID is required",
      });
    }

    const subject = await muallimService.getSubjectById(id);

    return res.json({
      success: true,
      data: subject,
    });
  });

  /**
   * Edit / Update academic subject details
   */
  updateSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Subject ID is required",
      });
    }

    const validation = validateUpdateSubjectInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const updated = await muallimService.updateSubject(id, req.body);

    return res.json({
      success: true,
      message: `Subject "${updated.name}" updated successfully`,
      data: updated,
    });
  });

  /**
   * Remove / Soft-delete an academic subject
   */
  removeSubject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Subject ID is required",
      });
    }

    const result = await muallimService.removeSubject(id);

    return res.json({
      success: true,
      message: result.message,
      data: { id: result.deletedId },
    });
  });

  /**
   * =========================================================================
   * AWARDS & ACHIEVEMENTS HANDLERS (Create, Delete/Remove, Query)
   * =========================================================================
   */

  /**
   * Create / Award an achievement or badge to a student
   */
  createAchievement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateCreateAchievementInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const teacherId = req.user?.id || "teacher-system";
    const achievement = await muallimService.createAchievement(req.body, teacherId);

    return res.status(201).json({
      success: true,
      message: `Achievement "${achievement.title}" awarded to student successfully`,
      data: achievement,
    });
  });

  /**
   * Get all active awards and achievements (optionally filtered by student or class)
   */
  getAchievements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const studentId = (req.query.studentId || req.params.studentId) as string | undefined;
    const classId = (req.query.classId || req.params.classId) as string | undefined;

    const achievements = await muallimService.getAchievements({ studentId, classId });

    return res.json({
      success: true,
      count: achievements.length,
      data: achievements,
    });
  });

  /**
   * Get single award / achievement by ID
   */
  getAchievementById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Achievement ID is required",
      });
    }

    const achievement = await muallimService.getAchievementById(id);

    return res.json({
      success: true,
      data: achievement,
    });
  });

  /**
   * Delete / Soft-delete an award or achievement
   */
  deleteAchievement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Achievement ID is required",
      });
    }

    const result = await muallimService.deleteAchievement(id);

    return res.json({
      success: true,
      message: result.message,
      data: { id: result.deletedId },
    });
  });

  /**
   * =========================================================================
   * TIMETABLE & PERIOD MANAGEMENT HANDLERS (Add, Edit/Update, Delete)
   * =========================================================================
   */

  /**
   * Add a new period to a class timetable
   */
  addPeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateCreatePeriodInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const period = await muallimService.addPeriod(req.body);

    return res.status(201).json({
      success: true,
      message: `Period ${period.periodNumber} (${period.subject}) added to timetable successfully`,
      data: period,
    });
  });

  /**
   * Get all active timetable periods (optionally filtered by class or day)
   */
  getPeriods = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const classId = (req.query.classId || req.params.classId) as string | undefined;
    const day = req.query.day as any;

    const periods = await muallimService.getPeriods({ classId, day });

    return res.json({
      success: true,
      count: periods.length,
      data: periods,
    });
  });

  /**
   * Get single timetable period by ID
   */
  getPeriodById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Period ID is required",
      });
    }

    const period = await muallimService.getPeriodById(id);

    return res.json({
      success: true,
      data: period,
    });
  });

  /**
   * Edit / Update a timetable period
   */
  updatePeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Period ID is required",
      });
    }

    const validation = validateUpdatePeriodInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const updated = await muallimService.updatePeriod(id, req.body);

    return res.json({
      success: true,
      message: `Period ${updated.periodNumber} (${updated.subject}) updated successfully`,
      data: updated,
    });
  });

  /**
   * Delete / Soft-delete a timetable period
   */
  deletePeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Period ID is required",
      });
    }

    const result = await muallimService.deletePeriod(id);

    return res.json({
      success: true,
      message: result.message,
      data: { id: result.deletedId },
    });
  });
}

export const muallimController = new MuallimController();




