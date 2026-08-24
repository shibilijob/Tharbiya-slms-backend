export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface AttendanceItemDTO {
  studentId: string;
  status: AttendanceStatus;
  remark?: string;
}

export interface MarkClassAttendanceDTO {
  classId: string;
  date: string; // YYYY-MM-DD
  academicYearId?: string;
  records: AttendanceItemDTO[];
}

export interface AttendanceFilterQuery {
  classId?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
}

export interface StudentAttendanceSummary {
  studentId: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  percentage: number;
}
