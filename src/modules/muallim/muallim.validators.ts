import type {
  MarkClassAttendanceDTO,
  RecordHifzDTO,
  RecordPracticalEvaluationDTO,
} from "./muallim.types.js";

/**
 * Validator for marking class attendance
 */
export const validateMarkAttendanceInput = (
  data: MarkClassAttendanceDTO
): { isValid: boolean; error?: string } => {
  if (!data.classId) {
    return { isValid: false, error: "Class ID is required" };
  }

  if (!data.date || isNaN(Date.parse(data.date))) {
    return { isValid: false, error: "A valid date (YYYY-MM-DD) is required" };
  }

  if (!data.records || !Array.isArray(data.records) || data.records.length === 0) {
    return { isValid: false, error: "Attendance records array cannot be empty" };
  }

  const validStatuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
  for (const item of data.records) {
    if (!item.studentId) {
      return { isValid: false, error: "Student ID is missing in one or more records" };
    }
    if (!validStatuses.includes(item.status)) {
      return {
        isValid: false,
        error: `Invalid status "${item.status}". Allowed: ${validStatuses.join(", ")}`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Validator for recording Quran / Hifz progress
 */
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

/**
 * Validator for practical and adab score evaluation
 */
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

  const validCategories = [
    "SALAH",
    "WUDU",
    "ADAB",
    "AKHLAQ",
    "CLEANLINESS",
    "RESPONSIBILITY",
    "PARTICIPATION",
  ];

  for (const item of data.scores) {
    if (!validCategories.includes(item.category)) {
      return {
        isValid: false,
        error: `Invalid category "${item.category}". Allowed: ${validCategories.join(", ")}`,
      };
    }
    if (typeof item.score !== "number" || item.score < 0 || item.score > 10) {
      return {
        isValid: false,
        error: `Score for ${item.category} must be a number between 0 and 10`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Validator for adding practical subject
 */
export const validateCreatePracticalSubjectInput = (
  data: { name?: string; classId?: string }
): { isValid: boolean; error?: string } => {
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    return { isValid: false, error: "Practical subject name is required (min 2 characters)" };
  }

  if (!data.classId || typeof data.classId !== "string" || data.classId.trim().length === 0) {
    return { isValid: false, error: "Class ID is required" };
  }

  return { isValid: true };
};

/**
 * Validator for updating practical subject
 */
export const validateUpdatePracticalSubjectInput = (
  data: { name?: string; classId?: string; isActive?: boolean }
): { isValid: boolean; error?: string } => {
  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length < 2)) {
    return { isValid: false, error: "Practical subject name must be at least 2 characters" };
  }

  if (data.classId !== undefined && (typeof data.classId !== "string" || data.classId.trim().length === 0)) {
    return { isValid: false, error: "Invalid class ID provided" };
  }

  return { isValid: true };
};

/**
 * Validator for adding academic subject
 */
export const validateCreateSubjectInput = (
  data: { name?: string; classId?: string }
): { isValid: boolean; error?: string } => {
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    return { isValid: false, error: "Subject name is required (min 2 characters)" };
  }

  if (!data.classId || typeof data.classId !== "string" || data.classId.trim().length === 0) {
    return { isValid: false, error: "Class ID is required" };
  }

  return { isValid: true };
};

/**
 * Validator for updating academic subject
 */
export const validateUpdateSubjectInput = (
  data: { name?: string; classId?: string; isActive?: boolean }
): { isValid: boolean; error?: string } => {
  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length < 2)) {
    return { isValid: false, error: "Subject name must be at least 2 characters" };
  }

  if (data.classId !== undefined && (typeof data.classId !== "string" || data.classId.trim().length === 0)) {
    return { isValid: false, error: "Invalid class ID provided" };
  }

  return { isValid: true };
};

/**
 * Validator for creating awards and achievements
 */
export const validateCreateAchievementInput = (
  data: { studentId?: string; title?: string; description?: string }
): { isValid: boolean; error?: string } => {
  if (!data.studentId || typeof data.studentId !== "string" || data.studentId.trim().length === 0) {
    return { isValid: false, error: "Student ID is required" };
  }

  if (!data.title || typeof data.title !== "string" || data.title.trim().length < 2) {
    return { isValid: false, error: "Achievement / Award title is required (min 2 characters)" };
  }

  if (!data.description || typeof data.description !== "string" || data.description.trim().length < 3) {
    return { isValid: false, error: "Achievement description is required (min 3 characters)" };
  }

  return { isValid: true };
};

/**
 * Validator for creating a timetable period
 */
export const validateCreatePeriodInput = (
  data: {
    classId?: string;
    day?: string;
    periodNumber?: number;
    startTime?: string;
    endTime?: string;
    subject?: string;
  }
): { isValid: boolean; error?: string } => {
  if (!data.classId || typeof data.classId !== "string" || data.classId.trim().length === 0) {
    return { isValid: false, error: "Class ID is required" };
  }

  const validDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (!data.day || !validDays.includes(data.day)) {
    return {
      isValid: false,
      error: `Valid day is required (${validDays.join(", ")})`,
    };
  }

  if (
    typeof data.periodNumber !== "number" ||
    data.periodNumber < 1 ||
    data.periodNumber > 12
  ) {
    return { isValid: false, error: "Period number must be between 1 and 12" };
  }

  if (!data.startTime || typeof data.startTime !== "string" || data.startTime.trim().length === 0) {
    return { isValid: false, error: "Start time is required" };
  }

  if (!data.endTime || typeof data.endTime !== "string" || data.endTime.trim().length === 0) {
    return { isValid: false, error: "End time is required" };
  }

  if (!data.subject || typeof data.subject !== "string" || data.subject.trim().length === 0) {
    return { isValid: false, error: "Subject is required" };
  }

  return { isValid: true };
};

/**
 * Validator for updating a timetable period
 */
export const validateUpdatePeriodInput = (
  data: {
    classId?: string;
    day?: string;
    periodNumber?: number;
    startTime?: string;
    endTime?: string;
    subject?: string;
  }
): { isValid: boolean; error?: string } => {
  const validDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (data.day !== undefined && !validDays.includes(data.day)) {
    return {
      isValid: false,
      error: `Valid day is required (${validDays.join(", ")})`,
    };
  }

  if (
    data.periodNumber !== undefined &&
    (typeof data.periodNumber !== "number" ||
      data.periodNumber < 1 ||
      data.periodNumber > 12)
  ) {
    return { isValid: false, error: "Period number must be between 1 and 12" };
  }

  if (data.startTime !== undefined && (typeof data.startTime !== "string" || data.startTime.trim().length === 0)) {
    return { isValid: false, error: "Start time cannot be empty" };
  }

  if (data.endTime !== undefined && (typeof data.endTime !== "string" || data.endTime.trim().length === 0)) {
    return { isValid: false, error: "End time cannot be empty" };
  }

  if (data.subject !== undefined && (typeof data.subject !== "string" || data.subject.trim().length === 0)) {
    return { isValid: false, error: "Subject cannot be empty" };
  }

  return { isValid: true };
};




