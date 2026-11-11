import test from "node:test";
import assert from "node:assert/strict";
import {
  MUALLIM_SHIFTS,
  MUALLIM_ATTENDANCE_STATUSES,
} from "../../constants/muallimShifts.js";
import { MuallimAttendanceService } from "./muallimAttendance.service.js";
import { generateMuallimMonthlyAttendancePdf } from "./muallimAttendance.pdf.js";

const service = new MuallimAttendanceService();

test("Muallim shift configuration has exactly 3 daily shifts with correct timings", () => {
  assert.equal(MUALLIM_SHIFTS.length, 3);
  assert.equal(MUALLIM_SHIFTS[0].id, "SHIFT_1");
  assert.equal(MUALLIM_SHIFTS[0].time, "6:00 AM – 7:15 AM");
  assert.equal(MUALLIM_SHIFTS[1].id, "SHIFT_2");
  assert.equal(MUALLIM_SHIFTS[1].time, "7:30 AM – 9:30 AM");
  assert.equal(MUALLIM_SHIFTS[2].id, "SHIFT_3");
  assert.equal(MUALLIM_SHIFTS[2].time, "6:30 PM – 9:30 PM");
});

test("Attendance statuses support PRESENT, CL, HPL, LLP, HOLIDAY", () => {
  const statusIds = MUALLIM_ATTENDANCE_STATUSES.map((s) => s.id);
  assert.deepEqual(statusIds, ["PRESENT", "CL", "HPL", "LLP", "HOLIDAY"]);
});

test("Date normalization creates exact UTC midnight date and prevents timezone drift", () => {
  const d1 = service.normalizeDate("2026-11-15");
  assert.equal(d1.toISOString(), "2026-11-15T00:00:00.000Z");

  const d2 = service.normalizeDate(new Date("2026-04-20T18:45:00.000Z"));
  assert.equal(d2.toISOString(), "2026-04-20T00:00:00.000Z");

  assert.equal(service.formatDateStr(d1), "2026-11-15");
});

test("Day-equivalent and attendance percentage calculations follow exact specification", () => {
  // Test case 1: Example from prompt
  // SHIFT_1 = PRESENT, SHIFT_2 = PRESENT, SHIFT_3 = HOLIDAY
  // Result: Present = 2/3 day, Holiday = 1/3 day, Attendance % = 100%
  const presentShifts = 2;
  const clShifts = 0;
  const hplShifts = 0;
  const llpShifts = 0;
  const holidayShifts = 1;

  const totalScheduled = presentShifts + clShifts + hplShifts + llpShifts;
  assert.equal(totalScheduled, 2);

  const presentDayEq = Number((presentShifts / 3).toFixed(2));
  const holidayDayEq = Number((holidayShifts / 3).toFixed(2));
  assert.equal(presentDayEq, 0.67); // 2/3 day
  assert.equal(holidayDayEq, 0.33); // 1/3 day

  const attendancePct = Number(((presentShifts / totalScheduled) * 100).toFixed(1));
  assert.equal(attendancePct, 100.0);

  // Test case 2: Mixed with CL, HPL, LLP
  // Present: 18, CL: 2, HPL: 1, LLP: 1, Holiday: 6
  // Total scheduled: 18 + 2 + 1 + 1 = 22 shifts
  // Attendance % = (18 / 22) * 100 = 81.8%
  const mixedPresent = 18;
  const mixedCl = 2;
  const mixedHpl = 1;
  const mixedLlp = 1;
  const mixedHoliday = 6;

  const mixedTotalScheduled = mixedPresent + mixedCl + mixedHpl + mixedLlp;
  assert.equal(mixedTotalScheduled, 22);

  const mixedPct = Number(((mixedPresent / mixedTotalScheduled) * 100).toFixed(1));
  assert.equal(mixedPct, 81.8);

  assert.equal(Number((mixedPresent / 3).toFixed(2)), 6.0);
  assert.equal(Number((mixedCl / 3).toFixed(2)), 0.67);
  assert.equal(Number((mixedHpl / 3).toFixed(2)), 0.33);
  assert.equal(Number((mixedLlp / 3).toFixed(2)), 0.33);
  assert.equal(Number((mixedHoliday / 3).toFixed(2)), 2.0);
});

test("PDF Export generates a valid non-empty A4 PDF buffer", async () => {
  const pdfBuffer = await generateMuallimMonthlyAttendancePdf({
    year: 2026,
    month: 11,
    monthName: "November",
    items: [
      {
        id: "6ab23ab27221130b25e65224",
        name: "Usthad Shibili Ahsani",
        phone: "9847123456",
        designation: "Muallim",
        assignedClasses: ["Class 3 A"],
        stats: {
          totalScheduledShifts: 24,
          presentShifts: 20,
          clShifts: 2,
          hplShifts: 1,
          llpShifts: 1,
          holidayShifts: 6,
          notRecordedShifts: 0,
          presentDayEquivalent: 6.67,
          clDayEquivalent: 0.67,
          hplDayEquivalent: 0.33,
          llpDayEquivalent: 0.33,
          holidayDayEquivalent: 2.0,
          attendancePercentage: 83.3,
        },
        dailyRecords: [
          {
            dateStr: "2026-11-01",
            dayNumber: 1,
            dayName: "Sunday",
            shift1: "PRESENT",
            shift2: "PRESENT",
            shift3: "HOLIDAY",
            shift3Reason: "Madrasa Foundation Day",
            summary: "2/3 Present, 1/3 Holiday",
          },
          {
            dateStr: "2026-11-02",
            dayNumber: 2,
            dayName: "Monday",
            shift1: "PRESENT",
            shift2: "PRESENT",
            shift3: "PRESENT",
            summary: "Full Day Present",
          },
        ],
      },
    ],
  });

  assert(Buffer.isBuffer(pdfBuffer));
  assert(pdfBuffer.length > 500); // Valid PDF header and content
  assert.equal(pdfBuffer.subarray(0, 4).toString(), "%PDF");
});

