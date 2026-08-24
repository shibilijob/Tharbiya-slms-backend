import mongoose from "mongoose";
import User from "../../models/User.js";
import Student from "../../models/Student.js";
import Class from "../../models/Class.js";
import { muallimService } from "../muallim/muallim.service.js";
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

const DAYS_LIST: MadrasaDay[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export class ParentService {
  /**
   * Helper: Verify that a student belongs to a specific parent (or bypass if parentId is empty/admin)
   */
  private async verifyStudentAccess(parentId: string, studentId: string) {
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error("Invalid student ID provided");
    }

    const query: any = {
      _id: new mongoose.Types.ObjectId(studentId),
      isActive: true,
    };

    if (parentId && mongoose.Types.ObjectId.isValid(parentId)) {
      query.parentId = new mongoose.Types.ObjectId(parentId);
    }

    const student = await Student.findOne(query)
      .populate({
        path: "classId",
        populate: { path: "classTeacherId", select: "name phone email designation" },
      })
      .populate("parentId", "name phone email");

    if (!student) {
      throw new Error(
        "Student record not found or access restricted: This student is not linked to your parent account."
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
        className: cls?.name || "Class 5",
        classDivision: cls?.division || "A",
        teacherId: teacher?._id?.toString(),
        teacherName: teacher?.name || "Usthad Shihabudheen Saadi",
        teacherPhone: teacher?.phone || "9847123456",
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
    const attendanceRes = await muallimService.getStudentAttendance(student._id.toString());
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
      className: cls?.name || "Class 5",
      classDivision: cls?.division || "A",
      teacherName: teacher?.name || "Usthad Shihabudheen Saadi",
      teacherPhone: teacher?.phone || "9847123456",
      teacherDesignation: teacher?.designation || "Usthad & Class Mentor",
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
      endDate
    );

    return {
      studentId: student._id.toString(),
      studentName: student.name,
      className: student.classId?.name || "Class 5",
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

    const [logs, summary] = await Promise.all([
      muallimService.getStudentHifzHistory(student._id.toString(), limit),
      muallimService.getStudentHifzSummary(student._id.toString()),
    ]);

    return {
      studentId: student._id.toString(),
      studentName: student.name,
      className: student.classId?.name || "Class 5",
      summary,
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
      className: student.classId?.name || "Class 5",
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
        className: "Class 5",
        classDivision: "A",
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
      className: cls?.name || "Class 5",
      classDivision: cls?.division || "A",
      teacherName: cls?.classTeacherId?.name || "Usthad Shihabudheen Saadi",
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
      className: student.classId?.name || "Class 5",
      totalCount: achievements.length,
      achievements,
    };
  }
}

export const parentService = new ParentService();
