import type { RecordHifzDTO } from "./hifz.types.js";

export const validateRecordHifzInput = (
  data: RecordHifzDTO
): { isValid: boolean; error?: string } => {
  if (!data.studentId) {
    return { isValid: false, error: "Student ID is required" };
  }

  if (!data.classId) {
    return { isValid: false, error: "Class ID is required" };
  }

  if (!data.surahNumber || data.surahNumber < 1 || data.surahNumber > 114) {
    return { isValid: false, error: "Surah number must be between 1 and 114" };
  }

  if (!data.fromAyah || !data.toAyah || data.fromAyah > data.toAyah) {
    return { isValid: false, error: "Invalid Ayah range: fromAyah cannot exceed toAyah" };
  }

  if (!data.rating || data.rating < 1 || data.rating > 5) {
    return { isValid: false, error: "Rating must be between 1 and 5" };
  }

  return { isValid: true };
};
