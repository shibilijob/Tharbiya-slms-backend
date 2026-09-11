import type { MarkClassAttendanceDTO } from "./attendance.types.js";

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

  const validStatuses = ["PRESENT", "ABSENT", "LEAVE", "HOLIDAY"];
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
