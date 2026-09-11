export type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "HOLIDAY";

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
  leaveDays: number;
  holidayDays: number;
  percentage: number;
}
