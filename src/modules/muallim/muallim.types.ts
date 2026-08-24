import type {
  AttendanceStatus,
  AttendanceItemDTO,
  MarkClassAttendanceDTO,
  AttendanceFilterQuery,
  StudentAttendanceSummary,
} from "../attendance/attendance.types.js";

import type {
  HifzRating,
  HifzSessionType,
  RecordHifzDTO,
  StudentHifzSummary,
} from "../hifz/hifz.types.js";

import type {
  PracticalCategory,
  PracticalScoreItem,
  RecordPracticalEvaluationDTO,
  StudentPracticalReport,
} from "../practical/practical.types.js";

// Re-export domain-specific types
export type {
  AttendanceStatus,
  AttendanceItemDTO,
  MarkClassAttendanceDTO,
  AttendanceFilterQuery,
  StudentAttendanceSummary,
  HifzRating,
  HifzSessionType,
  RecordHifzDTO,
  StudentHifzSummary,
  PracticalCategory,
  PracticalScoreItem,
  RecordPracticalEvaluationDTO,
  StudentPracticalReport,
};

// Muallim Classroom & Workspace Types
export interface MuallimAssignedClass {
  id: string;
  name: string;
  division?: string;
  studentCount: number;
}

export interface MuallimDashboardStats {
  assignedClassesCount: number;
  totalAssignedStudents: number;
  todayAttendanceMarked: boolean;
  todayAttendancePercentage: number;
  recentHifzLogsCount: number;
  recentEvaluationsCount: number;
}

// Practical Subject Management DTOs
export interface CreatePracticalSubjectDTO {
  name: string;
  classId: string;
}

export interface UpdatePracticalSubjectDTO {
  name?: string;
  classId?: string;
  isActive?: boolean;
}

export interface PracticalSubjectResponseDTO {
  id: string;
  name: string;
  classId: string;
  className?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Academic Subject Management DTOs
export interface CreateSubjectDTO {
  name: string;
  classId: string;
}

export interface UpdateSubjectDTO {
  name?: string;
  classId?: string;
  isActive?: boolean;
}

export interface SubjectResponseDTO {
  id: string;
  name: string;
  classId: string;
  className?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Awards & Achievements DTOs
export interface CreateAchievementDTO {
  studentId: string;
  classId?: string;
  title: string;
  titleMalayalam?: string;
  category?: string;
  description: string;
  badgeIcon?: string;
  date?: string;
}

export interface AchievementResponseDTO {
  id: string;
  studentId: string;
  studentName?: string;
  classId?: string;
  className?: string;
  title: string;
  titleMalayalam?: string;
  category: string;
  description: string;
  badgeIcon: string;
  date: Date;
  awardedById: string;
  awardedByName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Timetable & Period Management DTOs
export type MadrasaDay =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export interface CreatePeriodDTO {
  classId: string;
  day: MadrasaDay;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  subjectMalayalam?: string;
  teacherName?: string;
  teacherId?: string;
  room?: string;
  notes?: string;
}

export interface UpdatePeriodDTO {
  classId?: string;
  day?: MadrasaDay;
  periodNumber?: number;
  startTime?: string;
  endTime?: string;
  subject?: string;
  subjectMalayalam?: string;
  teacherName?: string;
  teacherId?: string;
  room?: string;
  notes?: string;
  isActive?: boolean;
}

export interface PeriodResponseDTO {
  id: string;
  classId: string;
  className?: string;
  day: MadrasaDay;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  subjectMalayalam?: string;
  teacherName?: string;
  teacherId?: string;
  room?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}




