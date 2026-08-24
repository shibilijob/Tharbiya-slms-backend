import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { parentService } from "./parent.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class ParentController {
  /**
   * Get Parent Profile and list of children
   */
  getParentProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parentId = req.user?.id || "";
    if (!parentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const profile = await parentService.getParentProfile(parentId);

    return res.json({
      success: true,
      data: profile,
    });
  });

  /**
   * Get all children linked to the authenticated parent
   */
  getParentChildren = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parentId = req.user?.id || "";
    if (!parentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const children = await parentService.getParentChildren(parentId);

    return res.json({
      success: true,
      count: children.length,
      data: children,
    });
  });

  /**
   * Get complete Child Profile (Academic, Attendance %, Hifz, Practical score)
   */
  getChildProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parentId = req.user?.role === "PARENT" ? req.user?.id || "" : "";
    const studentId = String(req.params.studentId || "");

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const profile = await parentService.getChildProfile(parentId, studentId);

    return res.json({
      success: true,
      data: profile,
    });
  });

  /**
   * Get Child Daily Attendance Calendar and Statistics
   */
  getChildAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parentId = req.user?.role === "PARENT" ? req.user?.id || "" : "";
    const studentId = String(req.params.studentId || "");
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const attendance = await parentService.getChildAttendance(parentId, studentId, startDate, endDate);

    return res.json({
      success: true,
      data: attendance,
    });
  });

  /**
   * Get Child Quran Recitation and Hifz Progress History & Summary
   */
  getChildHifz = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parentId = req.user?.role === "PARENT" ? req.user?.id || "" : "";
    const studentId = String(req.params.studentId || "");
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const hifzData = await parentService.getChildHifzProgress(parentId, studentId, limit);

    return res.json({
      success: true,
      data: hifzData,
    });
  });

  /**
   * Get Child Practical & Adab Score Report Card
   */
  getChildPractical = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parentId = req.user?.role === "PARENT" ? req.user?.id || "" : "";
    const studentId = String(req.params.studentId || "");

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const practicalData = await parentService.getChildPracticalReport(parentId, studentId);

    return res.json({
      success: true,
      data: practicalData,
    });
  });

  /**
   * Get Child Class Timetable Schedule
   */
  getChildTimetable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parentId = req.user?.role === "PARENT" ? req.user?.id || "" : "";
    const studentId = String(req.params.studentId || "");

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const timetable = await parentService.getChildTimetable(parentId, studentId);

    return res.json({
      success: true,
      data: timetable,
    });
  });

  /**
   * Get Child Awards and Achievements
   */
  getChildAchievements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parentId = req.user?.role === "PARENT" ? req.user?.id || "" : "";
    const studentId = String(req.params.studentId || "");

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const achievements = await parentService.getChildAchievements(parentId, studentId);

    return res.json({
      success: true,
      data: achievements,
    });
  });
}

export const parentController = new ParentController();
