export const MUALLIM_SHIFTS = [
  {
    id: "SHIFT_1",
    name: "Shift 1",
    time: "6:00 AM – 7:15 AM",
    label: "Shift 1 (6:00 AM – 7:15 AM)",
  },
  {
    id: "SHIFT_2",
    name: "Shift 2",
    time: "7:30 AM – 9:30 AM",
    label: "Shift 2 (7:30 AM – 9:30 AM)",
  },
  {
    id: "SHIFT_3",
    name: "Shift 3",
    time: "6:30 PM – 9:30 PM",
    label: "Shift 3 (6:30 PM – 9:30 PM)",
  },
] as const;

export type MuallimShiftId = "SHIFT_1" | "SHIFT_2" | "SHIFT_3";

export const MUALLIM_ATTENDANCE_STATUSES = [
  { id: "PRESENT", label: "Present", code: "P", color: "#0F6B50" },
  { id: "CL", label: "CL", description: "Casual Leave", code: "CL", color: "#2563EB" },
  { id: "HPL", label: "HPL", description: "Half Pay Leave", code: "HPL", color: "#D97706" },
  { id: "LLP", label: "LLP", description: "Leave Without Pay", code: "LLP", color: "#DC2626" },
  { id: "HOLIDAY", label: "Holiday", description: "Institutional Holiday", code: "H", color: "#7C3AED" },
] as const;

export type MuallimAttendanceStatusType = "PRESENT" | "CL" | "HPL" | "LLP" | "HOLIDAY";

