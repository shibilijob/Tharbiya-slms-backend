export type PracticalCategory =
  | "SALAH"
  | "WUDU"
  | "ADAB"
  | "AKHLAQ"
  | "CLEANLINESS"
  | "RESPONSIBILITY"
  | "PARTICIPATION";

export interface PracticalScoreItem {
  category: PracticalCategory;
  score: number; // 0 to 10
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
