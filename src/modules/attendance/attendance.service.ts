import { muallimService } from "../muallim/muallim.service.js";
import type { MarkClassAttendanceDTO, StudentAttendanceSummary } from "./attendance.types.js";

export class AttendanceService {
  /**
   * Bulk mark / upsert daily attendance for a class
   */
  async markClassAttendance(data: MarkClassAttendanceDTO, markedById: string) {
    return muallimService.markClassAttendance(data, markedById);
  }

  /**
   * Get class attendance for a specific date
   */
  async getClassAttendanceByDate(classId: string, dateStr: string) {
    return muallimService.getClassAttendanceByDate(classId, dateStr);
  }

  /**
   * Get attendance history and statistics for a student
   */
  async getStudentAttendance(
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ records: any[]; summary: StudentAttendanceSummary }> {
    return muallimService.getStudentAttendance(studentId, startDate, endDate);
  }
}

export const attendanceService = new AttendanceService();
