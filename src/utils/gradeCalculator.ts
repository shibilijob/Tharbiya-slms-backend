export interface GradeRule {
  minPercent: number;
  maxPercent: number;
  grade: string;
  color?: string; // e.g., for badge styling
}

export const DEFAULT_GRADE_SCALE: GradeRule[] = [
  { minPercent: 96, maxPercent: 100, grade: "A++", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { minPercent: 91, maxPercent: 95.99, grade: "A+", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { minPercent: 81, maxPercent: 90.99, grade: "A", color: "text-teal-600 bg-teal-50 border-teal-100" },
  { minPercent: 71, maxPercent: 80.99, grade: "B+", color: "text-blue-600 bg-blue-50 border-blue-100" },
  { minPercent: 61, maxPercent: 70.99, grade: "B", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
  { minPercent: 51, maxPercent: 60.99, grade: "C+", color: "text-amber-600 bg-amber-50 border-amber-100" },
  { minPercent: 40, maxPercent: 50.99, grade: "C", color: "text-orange-600 bg-orange-50 border-orange-100" },
  { minPercent: 0, maxPercent: 39.99, grade: "D", color: "text-rose-600 bg-rose-50 border-rose-200" },
];

export function calculateGrade(
  percentage: number,
  rules: GradeRule[] = DEFAULT_GRADE_SCALE
): { grade: string; color: string } {
  const rounded = Math.round(percentage * 100) / 100;
  const matched = rules.find(
    (rule) => rounded >= rule.minPercent && rounded <= rule.maxPercent
  );
  return matched
    ? { grade: matched.grade, color: matched.color || "text-gray-600 bg-gray-50 border-gray-200" }
    : { grade: "D", color: "text-rose-600 bg-rose-50 border-rose-200" };
}

export function calculateGradeFromMarks(
  obtained: number,
  max: number,
  rules: GradeRule[] = DEFAULT_GRADE_SCALE
): { grade: string; color: string } {
  if (!max || max <= 0) {
    return { grade: "D", color: "text-rose-600 bg-rose-50 border-rose-200" };
  }
  const percentage = (obtained / max) * 100;
  return calculateGrade(percentage, rules);
}

export function getGradeColor(
  grade: string,
  rules: GradeRule[] = DEFAULT_GRADE_SCALE
): string {
  const normalized = String(grade || "").trim().toUpperCase();
  if (normalized === "ABSENT" || normalized === "ABS") {
    return "text-rose-700 bg-rose-100 border-rose-300";
  }
  const matched = rules.find((r) => r.grade.toUpperCase() === normalized);
  return matched?.color || "text-slate-600 bg-slate-50 border-slate-200";
}

