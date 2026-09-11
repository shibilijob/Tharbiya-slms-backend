import type { RecordPracticalEvaluationDTO } from "./practical.types.js";

export const validatePracticalEvaluationInput = (
  data: RecordPracticalEvaluationDTO
): { isValid: boolean; error?: string } => {
  if (!data.studentId) {
    return { isValid: false, error: "Student ID is required" };
  }

  if (!data.classId) {
    return { isValid: false, error: "Class ID is required" };
  }

  if (!data.scores || !Array.isArray(data.scores) || data.scores.length === 0) {
    return { isValid: false, error: "Evaluation scores array cannot be empty" };
  }

  for (const item of data.scores) {
    if (!item.category || typeof item.category !== "string" || item.category.trim().length === 0) {
      return {
        isValid: false,
        error: `Category is required for all evaluation scores`,
      };
    }
    if (typeof item.score !== "number" || item.score < 0 || item.score > 100) {
      return {
        isValid: false,
        error: `Score for ${item.category} must be a number between 0 and 100`,
      };
    }
  }

  return { isValid: true };
};
