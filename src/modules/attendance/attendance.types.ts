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

export interface SaveMonthlyBacklogDTO {
  classId: string;
  year: number;
  month: number;
  monthName?: string;
  totalWorkingDays: number;
  studentsData: Array<{
    studentId: string;
    attendedDays: number;
  }>;
}

export interface StudentAttendanceCardStat {
  studentId: string;
  currentMonth: string; // e.g. "21/24"
  prevMonths: string;   // e.g. "22/25"
  totalAttendance: string; // e.g. "43/49"
  currentMonthPercent: number;
  prevMonthsPercent: number;
  totalPercent: number;
  currentAttended?: number;
  currentWorking?: number;
  prevAttended?: number;
  prevWorking?: number;
  totalAttended?: number;
  totalWorking?: number;
}
