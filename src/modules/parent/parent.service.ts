import mongoose from "mongoose";
import User from "../../models/User.js";
import Student from "../../models/Student.js";
import HifzTarget from "../../models/HifzTarget.js";
import { AppError } from "../../utils/AppError.js";
import { muallimService } from "../muallim/muallim.service.js";
import { expandRangesToAyahs, parseAyahRangesFromProgress } from "../hifz/hifz.service.js";
import type {
  ParentProfileDTO,
  ParentChildSummaryDTO,
  ChildProfileDTO,
  ChildAttendanceDTO,
  ChildHifzDTO,
  ChildPracticalDTO,
  ChildTimetableDTO,
  ChildAchievementsDTO,
} from "./parent.types.js";
import type { MadrasaDay, PeriodResponseDTO } from "../muallim/muallim.types.js";

const DEFAULT_MADRASA_NAME = "Darunnajath Mundambra";
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || process.env.TZ || "Asia/Kolkata";

const DAYS_LIST: MadrasaDay[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatParentHifzTarget = (target: any) => ({
  id: target._id.toString(),
  classId: target.classId?._id ? target.classId._id.toString() : target.classId?.toString() || "",
  className: (target.classId as any)?.name || undefined,
  academicYearId: target.academicYearId?._id
    ? target.academicYearId._id.toString()
    : target.academicYearId?.toString() || "",
  academicYearName: (target.academicYearId as any)?.name || undefined,
  criteria: target.criteria,
  juzNumber: target.juzNumber || undefined,
  surahNumber: target.surahNumber || undefined,
  surahName: target.surahName || undefined,
  totalAyahsToMemorize: target.totalAyahsToMemorize || undefined,
  fromAyah: target.fromAyah || undefined,
  toAyah: target.toAyah || undefined,
  schedules:
    target.schedules && target.schedules.length > 0
      ? target.schedules.map((schedule: any) => ({
          dateFrom: new Date(schedule.dateFrom).toISOString(),
          dateTo: new Date(schedule.dateTo).toISOString(),
          ayahFrom: schedule.ayahFrom,
          ayahTo: schedule.ayahTo,
        }))
      : target.fromAyah && target.toAyah
      ? [
          {
            dateFrom: new Date(target.startDate).toISOString(),
            dateTo: new Date(target.endDate).toISOString(),
            ayahFrom: target.fromAyah,
            ayahTo: target.toAyah,
          },
        ]
      : [],
  startDate: new Date(target.startDate).toISOString(),
  endDate: new Date(target.endDate).toISOString(),
  status: target.status,
  isActive: target.isActive !== false,
  createdById: target.createdById?._id
    ? target.createdById._id.toString()
    : target.createdById?.toString() || "",
  createdByName: (target.createdById as any)?.name || undefined,
  createdAt: target.createdAt ? new Date(target.createdAt).toISOString() : "",
  updatedAt: target.updatedAt ? new Date(target.updatedAt).toISOString() : "",
});

const getCompletedAyahsForLogs = (logs: any[]) => {
  const completedRanges = logs.flatMap((log: any) => {
    const ranges = Array.isArray(log.completedRanges) && log.completedRanges.length > 0
      ? log.completedRanges
      : log.completedAyahFrom && log.completedAyahTo
      ? [{ ayahFrom: log.completedAyahFrom, ayahTo: log.completedAyahTo }]
      : parseAyahRangesFromProgress(log.progress || "");

    return ranges.map((range: any) => ({
      ayahFrom: Number(range.ayahFrom),
      ayahTo: Number(range.ayahTo),
    }));
  });

  return expandRangesToAyahs(completedRanges);
};

const getTargetAyahCount = (target: any) => {
  if (target.totalAyahsToMemorize) {
    return Number(target.totalAyahsToMemorize);
  }

  const scheduledAyahs = new Set<number>();
  for (const schedule of target.schedules || []) {
    for (let ayah = schedule.ayahFrom; ayah <= schedule.ayahTo; ayah += 1) {
      scheduledAyahs.add(ayah);
    }
  }

  if (scheduledAyahs.size > 0) {
    return scheduledAyahs.size;
  }

  if (target.fromAyah && target.toAyah) {
    return Math.max(0, Number(target.toAyah) - Number(target.fromAyah) + 1);
  }

  return 0;
};

export const getFirstDayOfCurrentMonthForAttendance = (now = new Date()): Date => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  if (!year || !month) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
};

export class ParentService {
  /**
   * Helper: Verify that a student belongs to a specific parent.
   */
  private async verifyStudentAccess(parentId: string, studentId: string) {
    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
      throw new AppError("Forbidden: Parent account is required for this student resource.", 403);
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new AppError("Invalid student ID provided", 400);
    }

    const query: any = {
      _id: new mongoose.Types.ObjectId(studentId),
      parentId: new mongoose.Types.ObjectId(parentId),
      isActive: true,
    };

    const student = await Student.findOne(query)
      .populate({
        path: "classId",
        populate: { path: "classTeacherId", select: "name phone email designation" },
      })
      .populate("parentId", "name phone email");

    if (!student) {
      throw new AppError(
        "Forbidden: This student is not linked to your parent account.",
        403
      );
    }

    return student;
  }

  /**
   * Get Parent Profile with overview of all linked children
   */
  async getParentProfile(parentId: string): Promise<ParentProfileDTO> {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      throw new Error("Invalid parent ID");
    }

    const user = await User.findById(parentId);
    if (!user || !user.isActive) {
      throw new Error("Parent account not found or inactive");
    }

    const children = await this.getParentChildren(parentId);

    return {
      id: user._id.toString(),
      name: user.name,
      phone: user.phone,
      email: user.email || undefined,
      role: user.role,
      madrasaName: (user as any).madrasaName || DEFAULT_MADRASA_NAME,
      children,
    };
  }

  /**
   * Get list of all active children linked to the parent
   */
  async getParentChildren(parentId: string): Promise<ParentChildSummaryDTO[]> {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      throw new Error("Invalid parent ID");
    }

    const students = await Student.find({
      parentId: new mongoose.Types.ObjectId(parentId),
      isActive: true,
    })
      .populate({
        path: "classId",
        populate: { path: "classTeacherId", select: "name phone email designation" },
      })
      .sort({ name: 1 });

    return students.map((s: any) => {
      const cls = s.classId;
      const teacher = cls?.classTeacherId;

      return {
        id: s._id.toString(),
        name: s.name,
        admissionNumber: s.admissionNumber,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth,
        classId: cls?._id?.toString(),
      className: cls?.name || "",
      classDivision: cls?.division,
      teacherId: teacher?._id?.toString(),
      teacherName: teacher?.name,
      teacherPhone: teacher?.phone,
      };
    });
  }

  /**
   * Get Comprehensive Child Profile
   */
  async getChildProfile(parentId: string, studentId: string): Promise<ChildProfileDTO> {
    const student: any = await this.verifyStudentAccess(parentId, studentId);

    const cls = student.classId;
    const teacher = cls?.classTeacherId;

    // Fetch child's attendance summary
    const attendanceRes = await muallimService.getStudentAttendance(
      student._id.toString(),
      undefined,
      undefined,
      getFirstDayOfCurrentMonthForAttendance()
    );
    const attendancePercentage = attendanceRes.summary.percentage;

    // Fetch child's Hifz summary
    const hifzSummary = await muallimService.getStudentHifzSummary(student._id.toString());

    // Fetch child's Practical report
    const practicalReport = await muallimService.getStudentPracticalReport(student._id.toString());

    // Fetch child's latest achievements
    const achievements = await muallimService.getAchievements({
      studentId: student._id.toString(),
    });

    return {
      id: student._id.toString(),
      admissionNumber: student.admissionNumber,
      name: student.name,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      address: student.address,
      admissionDate: student.admissionDate,
      classId: cls?._id?.toString() || "",
      className: cls?.name || "",
      classDivision: cls?.division,
      teacherName: teacher?.name || "",
      teacherPhone: teacher?.phone,
      teacherDesignation: teacher?.designation,
      attendancePercentage,
      hifzSummary,
      practicalAverageScore: practicalReport.averageScore,
      recentAchievements: achievements.slice(0, 5),
    };
  }

  /**
   * Get Child Daily Attendance Calendar & History
   */
  async getChildAttendance(
    parentId: string,
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ChildAttendanceDTO> {
    const student: any = await this.verifyStudentAccess(parentId, studentId);

    const attendanceData = await muallimService.getStudentAttendance(
      student._id.toString(),
      startDate,
      endDate,
      getFirstDayOfCurrentMonthForAttendance()
    );

    return {
      studentId: student._id.toString(),
      studentName: student.name,
      className: student.classId?.name || "",
      summary: attendanceData.summary,
      records: attendanceData.records,
    };
  }

  /**
   * Get Child Quran Recitation & Hifz Progress
   */
  async getChildHifzProgress(
    parentId: string,
    studentId: string,
    limit = 30
  ): Promise<ChildHifzDTO> {
    const student: any = await this.verifyStudentAccess(parentId, studentId);

    const classId = student.classId?._id || student.classId;

    const [logs, summary, targets] = await Promise.all([
      muallimService.getStudentHifzHistory(student._id.toString(), limit),
      muallimService.getStudentHifzSummary(student._id.toString()),
      classId
        ? HifzTarget.find({ classId, isActive: true })
            .sort({ startDate: 1, createdAt: 1 })
            .populate("classId", "name")
            .populate("academicYearId", "name")
            .populate("createdById", "name")
        : [],
    ]);

    const targetProgress = targets.map((target: any) => {
      const targetId = target._id.toString();
      const targetLogs = logs.filter((log: any) => {
        const logTargetId = log.hifzTargetId?._id?.toString?.() || log.hifzTargetId?.toString?.();
        return logTargetId === targetId;
      });
      const completedAyahs = getCompletedAyahsForLogs(targetLogs);
      const targetAyahCount = getTargetAyahCount(target);
      const progressPercentage = targetAyahCount > 0
        ? Math.min(100, Math.round((completedAyahs.length / targetAyahCount) * 100))
        : 0;

      return {
        target: formatParentHifzTarget(target),
        completedAyahs,
        progressPercentage,
        status: targetLogs.length === 0
          ? "NOT_STARTED" as const
          : progressPercentage >= 100
          ? "COMPLETED" as const
          : "IN_PROGRESS" as const,
        logs: targetLogs,
      };
    });

    const firstTargetProgress = targetProgress[0] || null;

    return {
      studentId: student._id.toString(),
      studentName: student.name,
      student: {
        id: student._id.toString(),
        name: student.name,
        classId: classId?.toString?.() || "",
        className: student.classId?.name || "",
      },
      className: student.classId?.name || "",
      summary,
      target: firstTargetProgress?.target || null,
      targets: targetProgress,
      completedAyahs: firstTargetProgress?.completedAyahs || [],
      logs,
    };
  }

  /**
   * Get Child Practical & Adab Score Report Card
   */
  async getChildPracticalReport(
    parentId: string,
    studentId: string
  ): Promise<ChildPracticalDTO> {
    const student: any = await this.verifyStudentAccess(parentId, studentId);

    const [evaluations, report] = await Promise.all([
      muallimService.getStudentEvaluations(student._id.toString()),
      muallimService.getStudentPracticalReport(student._id.toString()),
    ]);

    return {
      studentId: student._id.toString(),
      studentName: student.name,
      className: student.classId?.name || "",
      report,
      evaluations,
    };
  }

  /**
   * Get Child Class Timetable Schedule
   */
  async getChildTimetable(parentId: string, studentId: string): Promise<ChildTimetableDTO> {
    const student: any = await this.verifyStudentAccess(parentId, studentId);

    const cls = student.classId;
    const classId = cls?._id?.toString();

    const emptySchedules: Record<MadrasaDay, PeriodResponseDTO[]> = {
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    if (!classId) {
      return {
        classId: "",
        className: "",
        classDivision: undefined,
        schedules: emptySchedules,
      };
    }

    const periods = await muallimService.getPeriods({ classId });

    const schedules: Record<MadrasaDay, PeriodResponseDTO[]> = { ...emptySchedules };
    for (const p of periods) {
      if (schedules[p.day]) {
        schedules[p.day].push(p);
      }
    }

    // Sort periods for each day
    for (const day of DAYS_LIST) {
      schedules[day].sort((a, b) => a.periodNumber - b.periodNumber);
    }

    return {
      classId,
      className: cls?.name || "",
      classDivision: cls?.division,
      teacherName: cls?.classTeacherId?.name,
      schedules,
    };
  }

  /**
   * Get Child Awards & Achievements
   */
  async getChildAchievements(
    parentId: string,
    studentId: string
  ): Promise<ChildAchievementsDTO> {
    const student: any = await this.verifyStudentAccess(parentId, studentId);

    const achievements = await muallimService.getAchievements({
      studentId: student._id.toString(),
    });

    return {
      studentId: student._id.toString(),
      studentName: student.name,
      className: student.classId?.name || "",
      totalCount: achievements.length,
      achievements,
    };
  }
}

export const parentService = new ParentService();
