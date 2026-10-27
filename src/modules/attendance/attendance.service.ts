import { muallimService } from "../muallim/muallim.service.js";
import type {
  MarkClassAttendanceDTO,
  StudentAttendanceSummary,
  SaveMonthlyBacklogDTO,
  StudentAttendanceCardStat,
} from "./attendance.types.js";

export class AttendanceService {
  /**
   * Bulk mark / upsert daily attendance for a class
   */
  async markClassAttendance(data: MarkClassAttendanceDTO, markedById: string) {
    return muallimService.markClassAttendance(data, markedById);
  }

  /**
   * Save or update monthly attendance backlog
   */
  async saveMonthlyBacklog(data: SaveMonthlyBacklogDTO, muallimId?: string) {
    return muallimService.saveMonthlyBacklog(data, muallimId);
  }

  /**
   * Get class monthly backlog records
   */
  async getClassMonthlyBacklog(classId: string, year?: number, month?: number, muallimId?: string) {
    return muallimService.getClassMonthlyBacklog(classId, year, month, muallimId);
  }

  /**
   * Get class combined attendance stats (Current Month, Prev Months, Total) for cards
   */
  async getClassAttendanceStats(classId: string, targetDateStr?: string, muallimId?: string) {
    return muallimService.getClassAttendanceStats(classId, targetDateStr, muallimId);
  }

  /**
   * Get class attendance for a specific date
   */
  async getClassAttendanceByDate(classId: string, dateStr: string, muallimId?: string) {
    return muallimService.getClassAttendanceByDate(classId, dateStr, muallimId);
  }

  /**
   * Get attendance history and statistics for a student
   */
  async getStudentAttendance(
    studentId: string,
    startDate?: string,
    endDate?: string,
    beforeDate?: Date
  ): Promise<{ records: any[]; summary: StudentAttendanceSummary }> {
    return muallimService.getStudentAttendance(studentId, startDate, endDate, beforeDate);
  }

  /**
   * Get attendance records filtered by query parameters and user context
   */
  async getAttendanceList(filters: {
    classId?: string;
    date?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
    beforeDate?: Date;
    userId?: string;
    role?: string;
  }) {
    return muallimService.getAttendanceList(filters);
  }
}

export const attendanceService = new AttendanceService();

