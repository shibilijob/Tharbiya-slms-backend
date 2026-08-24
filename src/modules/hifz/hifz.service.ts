import { muallimService } from "../muallim/muallim.service.js";
import type { RecordHifzDTO, StudentHifzSummary } from "./hifz.types.js";

export class HifzService {
  /**
   * Log daily Quran recitation / Hifz / Muraja'ah session
   */
  async recordHifzLog(data: RecordHifzDTO, teacherId: string) {
    return muallimService.recordHifzLog(data, teacherId);
  }

  /**
   * Get student's recent Quran recitation and Hifz history
   */
  async getStudentHifzHistory(studentId: string, limit = 20) {
    return muallimService.getStudentHifzHistory(studentId, limit);
  }

  /**
   * Get student's overall Hifz statistics and summary
   */
  async getStudentHifzSummary(studentId: string): Promise<StudentHifzSummary> {
    return muallimService.getStudentHifzSummary(studentId);
  }
}

export const hifzService = new HifzService();
