import mongoose from "mongoose";
import type {
  CreateHifzTargetDTO,
  UpdateHifzTargetDTO,
  CreateHifzRecordDTO,
  UpdateHifzRecordDTO,
  HifzRecordStatus,
  HifzRangeDTO,
  HifzScheduleDTO,
} from "./hifz.types.js";

export const normalizeHifzStatus = (status?: string): HifzRecordStatus => {
  if (!status) return "COMPLETED";
  const clean = status.trim().toUpperCase().replace(/[\s-]/g, "_");
  if (clean === "PARTIAL" || clean === "IN_PROGRESS") return "PARTIAL";
  if (clean === "NOT_COMPLETED" || clean === "INCOMPLETE" || clean === "PENDING")
    return "NOT_COMPLETED";
  return "COMPLETED";
};

export const validateCreateHifzTargetInput = (
  data: CreateHifzTargetDTO
): { isValid: boolean; error?: string } => {
  if (!data.classId || String(data.classId).trim() === "") {
    return { isValid: false, error: "Class ID is required" };
  }

  if (!data.surahName || String(data.surahName).trim() === "") {
    return { isValid: false, error: "Surah Name is required" };
  }

  if (!data.totalAyahsToMemorize || data.totalAyahsToMemorize < 1) {
    return { isValid: false, error: "Total Ayahs Need to Memorize must be positive" };
  }

  if (!data.criteria || String(data.criteria).trim() === "") {
    data.criteria = String(data.surahName).trim();
  }

  if (!data.startDate) {
    return { isValid: false, error: "Start date is required" };
  }

  if (!data.endDate) {
    return { isValid: false, error: "End date is required" };
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (isNaN(start.getTime())) {
    return { isValid: false, error: "Invalid start date format" };
  }

  if (isNaN(end.getTime())) {
    return { isValid: false, error: "Invalid end date format" };
  }

  if (end < start) {
    return { isValid: false, error: "End date cannot be before start date" };
  }

  if (data.surahNumber !== undefined && (data.surahNumber < 1 || data.surahNumber > 114)) {
    return { isValid: false, error: "Surah number must be between 1 and 114" };
  }

  if (data.fromAyah !== undefined && data.fromAyah < 1) {
    return { isValid: false, error: "fromAyah must be at least 1" };
  }

  if (data.toAyah !== undefined && data.toAyah < 1) {
    return { isValid: false, error: "toAyah must be at least 1" };
  }

  if (
    data.fromAyah !== undefined &&
    data.toAyah !== undefined &&
    data.fromAyah > data.toAyah
  ) {
    return { isValid: false, error: "fromAyah cannot exceed toAyah" };
  }

  if (data.fromAyah === undefined || data.toAyah === undefined) {
    return { isValid: false, error: "Ayah From and Ayah To are required" };
  }

  const scheduleError = validateSchedules(data.schedules);
  if (scheduleError) return { isValid: false, error: scheduleError };

  return { isValid: true };
};

export const validateUpdateHifzTargetInput = (
  data: UpdateHifzTargetDTO
): { isValid: boolean; error?: string } => {
  if (data.criteria !== undefined && String(data.criteria).trim() === "") {
    return { isValid: false, error: "Criteria cannot be empty" };
  }

  if (data.surahName !== undefined && String(data.surahName).trim() === "") {
    return { isValid: false, error: "Surah Name cannot be empty" };
  }

  if (data.totalAyahsToMemorize !== undefined && data.totalAyahsToMemorize < 1) {
    return { isValid: false, error: "Total Ayahs Need to Memorize must be positive" };
  }

  if (data.startDate && isNaN(new Date(data.startDate).getTime())) {
    return { isValid: false, error: "Invalid start date format" };
  }

  if (data.endDate && isNaN(new Date(data.endDate).getTime())) {
    return { isValid: false, error: "Invalid end date format" };
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      return { isValid: false, error: "End date cannot be before start date" };
    }
  }

  if (data.surahNumber !== undefined && (data.surahNumber < 1 || data.surahNumber > 114)) {
    return { isValid: false, error: "Surah number must be between 1 and 114" };
  }

  if (
    data.fromAyah !== undefined &&
    data.toAyah !== undefined &&
    data.fromAyah > data.toAyah
  ) {
    return { isValid: false, error: "fromAyah cannot exceed toAyah" };
  }

  if (data.fromAyah !== undefined && data.fromAyah < 1) {
    return { isValid: false, error: "fromAyah must be at least 1" };
  }

  if (data.toAyah !== undefined && data.toAyah < 1) {
    return { isValid: false, error: "toAyah must be at least 1" };
  }

  const scheduleError = validateSchedules(data.schedules);
  if (scheduleError) return { isValid: false, error: scheduleError };

  return { isValid: true };
};

const validateSchedules = (schedules?: HifzScheduleDTO[]): string | null => {
  if (schedules === undefined) return null;
  if (!Array.isArray(schedules)) return "Schedules must be an array";

  for (const [index, schedule] of schedules.entries()) {
    const label = `Schedule ${index + 1}`;
    if (!schedule.dateFrom) return `${label}: Date From is required`;
    if (!schedule.dateTo) return `${label}: Date To is required`;
    if (!schedule.ayahFrom) return `${label}: Ayah From is required`;
    if (!schedule.ayahTo) return `${label}: Ayah To is required`;

    const dateFrom = new Date(schedule.dateFrom);
    const dateTo = new Date(schedule.dateTo);
    if (isNaN(dateFrom.getTime())) return `${label}: Invalid Date From`;
    if (isNaN(dateTo.getTime())) return `${label}: Invalid Date To`;
    if (dateTo < dateFrom) return `${label}: Date To cannot be before Date From`;
    if (schedule.ayahFrom < 1 || schedule.ayahTo < 1) {
      return `${label}: Ayah numbers must be positive`;
    }
    if (schedule.ayahFrom > schedule.ayahTo) {
      return `${label}: Ayah From cannot exceed Ayah To`;
    }
  }

  return null;
};

const validateCompletedRanges = (ranges?: HifzRangeDTO[]): string | null => {
  if (ranges === undefined) return null;
  if (!Array.isArray(ranges)) return "Completed ranges must be an array";

  for (const [index, range] of ranges.entries()) {
    const label = `Completed range ${index + 1}`;
    if (!range.ayahFrom) return `${label}: Ayah From is required`;
    if (!range.ayahTo) return `${label}: Ayah To is required`;
    if (range.ayahFrom < 1 || range.ayahTo < 1) {
      return `${label}: Ayah numbers must be positive`;
    }
    if (range.ayahFrom > range.ayahTo) {
      return `${label}: Ayah From cannot exceed Ayah To`;
    }
  }

  return null;
};

export const validateCreateHifzRecordInput = (
  data: CreateHifzRecordDTO
): { isValid: boolean; error?: string } => {
  if (!data.studentId || !mongoose.Types.ObjectId.isValid(data.studentId)) {
    return { isValid: false, error: "Valid Student ID is required" };
  }

  if (!data.classId || String(data.classId).trim() === "") {
    return { isValid: false, error: "Class ID is required" };
  }

  if (!data.hifzTargetId || !mongoose.Types.ObjectId.isValid(data.hifzTargetId)) {
    return { isValid: false, error: "Valid Hifz Target ID is required" };
  }

  if (!data.progress || String(data.progress).trim() === "") {
    return { isValid: false, error: "Progress description (e.g. 'Ayah 1-5') is required" };
  }

  if (data.completedAyahFrom !== undefined && data.completedAyahFrom < 1) {
    return { isValid: false, error: "Completed Ayah From must be positive" };
  }

  if (data.completedAyahTo !== undefined && data.completedAyahTo < 1) {
    return { isValid: false, error: "Completed Ayah To must be positive" };
  }

  if (
    data.completedAyahFrom !== undefined &&
    data.completedAyahTo !== undefined &&
    data.completedAyahFrom > data.completedAyahTo
  ) {
    return { isValid: false, error: "Completed Ayah From cannot exceed Completed Ayah To" };
  }

  const rangeError = validateCompletedRanges(data.completedRanges);
  if (rangeError) return { isValid: false, error: rangeError };

  if (data.date && isNaN(new Date(data.date).getTime())) {
    return { isValid: false, error: "Invalid record date format" };
  }

  return { isValid: true };
};

export const validateUpdateHifzRecordInput = (
  data: UpdateHifzRecordDTO
): { isValid: boolean; error?: string } => {
  if (data.progress !== undefined && String(data.progress).trim() === "") {
    return { isValid: false, error: "Progress cannot be empty" };
  }

  if (data.completedAyahFrom !== undefined && data.completedAyahFrom < 1) {
    return { isValid: false, error: "Completed Ayah From must be positive" };
  }

  if (data.completedAyahTo !== undefined && data.completedAyahTo < 1) {
    return { isValid: false, error: "Completed Ayah To must be positive" };
  }

  if (
    data.completedAyahFrom !== undefined &&
    data.completedAyahTo !== undefined &&
    data.completedAyahFrom > data.completedAyahTo
  ) {
    return { isValid: false, error: "Completed Ayah From cannot exceed Completed Ayah To" };
  }

  const rangeError = validateCompletedRanges(data.completedRanges);
  if (rangeError) return { isValid: false, error: rangeError };

  if (data.date && isNaN(new Date(data.date).getTime())) {
    return { isValid: false, error: "Invalid record date format" };
  }

  return { isValid: true };
};
