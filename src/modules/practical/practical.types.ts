export type PracticalCategory =
  | "SALAH"
  | "WUDU"
  | "ADAB"
  | "AKHLAQ"
  | "CLEANLINESS"
  | "RESPONSIBILITY"
  | "PARTICIPATION"
  | string;

export interface PracticalScoreItem {
  category: PracticalCategory;
  practicalSubjectId?: string;
  score: number; // 0 to maxScore (up to 100)
  remarks?: string;
}

export interface RecordPracticalEvaluationDTO {
  studentId: string;
  classId: string;
  term?: string; // e.g. "Term 1", "Monthly - August"
  month?: string; // e.g. "2026-08"
  scores: PracticalScoreItem[];
  overallRemarks?: string;
  date?: string;
}

export interface StudentPracticalReport {
  studentId: string;
  averageScore: number;
  totalEvaluations: number;
  categoryBreakdown: Record<string, number>;
  recentEvaluations: any[];
}

export interface RecordMonthlyScoreDTO {
  studentId: string;
  classId: string;
  practicalSubjectId: string;
  month: number; // 1 to 12
  year: number; // e.g. 2026
  score: number;
  remarks?: string;
  date?: string | Date;
}

export interface BulkStudentScoreItem {
  studentId: string;
  score: number;
  remarks?: string;
}

export interface BulkRecordMonthlyScoreDTO {
  classId: string;
  practicalSubjectId: string;
  month: number;
  year: number;
  scores: BulkStudentScoreItem[];
  date?: string | Date;
}

export interface MonthlyScoreQueryDTO {
  classId?: string;
  practicalSubjectId?: string;
  month?: number | string;
  year?: number | string;
  studentId?: string;
}

export interface PracticalScoreResponseDTO {
  id: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  classId: string;
  className?: string;
  practicalSubjectId: string;
  practicalSubjectName?: string;
  month: number;
  year: number;
  score: number;
  maxScore: number;
  percentage?: number;
  remarks?: string;
  evaluatedById: string;
  evaluatedByName?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

