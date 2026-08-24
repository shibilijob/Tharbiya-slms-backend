import { muallimService } from "../muallim/muallim.service.js";
import type {
  RecordPracticalEvaluationDTO,
  StudentPracticalReport,
} from "./practical.types.js";

export class PracticalService {
  /**
   * Record a new practical and adab evaluation for a student
   */
  async recordEvaluation(data: RecordPracticalEvaluationDTO, evaluatedById: string) {
    return muallimService.recordEvaluation(data, evaluatedById);
  }

  /**
   * Get practical evaluation history for a student
   */
  async getStudentEvaluations(studentId: string) {
    return muallimService.getStudentEvaluations(studentId);
  }

  /**
   * Get comprehensive practical report for a student
   */
  async getStudentPracticalReport(studentId: string): Promise<StudentPracticalReport> {
    return muallimService.getStudentPracticalReport(studentId);
  }
}

export const practicalService = new PracticalService();
