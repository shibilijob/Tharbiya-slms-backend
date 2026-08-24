import type { StudentAttendanceSummary } from "../attendance/attendance.types.js";
import type { StudentHifzSummary } from "../hifz/hifz.types.js";
import type { StudentPracticalReport } from "../practical/practical.types.js";
import type { AchievementResponseDTO, PeriodResponseDTO, MadrasaDay } from "../muallim/muallim.types.js";

// Parent & Child Summary DTOs
export interface ParentChildSummaryDTO {
  id: string;
  name: string;
  admissionNumber: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth?: Date | undefined;
  classId?: string | undefined;
  className: string;
  classDivision?: string | undefined;
  teacherId?: string | undefined;
  teacherName?: string | undefined;
  teacherPhone?: string | undefined;
}

export interface ParentProfileDTO {
  id: string;
  name: string;
  phone: string;
  email?: string | undefined;
  role: string;
  madrasaName: string;
  children: ParentChildSummaryDTO[];
}

export interface ChildProfileDTO {
  id: string;
  admissionNumber: string;
  name: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth?: Date | undefined;
  address?: string | undefined;
  admissionDate: Date;
  classId: string;
  className: string;
  classDivision?: string | undefined;
  teacherName: string;
  teacherPhone?: string | undefined;
  teacherDesignation?: string | undefined;
  attendancePercentage: number;
  hifzSummary: StudentHifzSummary;
  practicalAverageScore: number;
  recentAchievements: AchievementResponseDTO[];
}

export interface ChildAttendanceDTO {
  studentId: string;
  studentName: string;
  className: string;
  summary: StudentAttendanceSummary;
  records: any[];
}

export interface ChildHifzDTO {
  studentId: string;
  studentName: string;
  className: string;
  summary: StudentHifzSummary;
  logs: any[];
}

export interface ChildPracticalDTO {
  studentId: string;
  studentName: string;
  className: string;
  report: StudentPracticalReport;
  evaluations: any[];
}

export interface ChildTimetableDTO {
  classId: string;
  className: string;
  classDivision?: string | undefined;
  teacherName?: string | undefined;
  schedules: Record<MadrasaDay, PeriodResponseDTO[]>;
}

export interface ChildAchievementsDTO {
  studentId: string;
  studentName: string;
  className: string;
  totalCount: number;
  achievements: AchievementResponseDTO[];
}
