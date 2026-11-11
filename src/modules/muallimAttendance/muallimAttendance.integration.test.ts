import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import User from "../../models/User.js";
import MuallimAttendance from "../../models/MuallimAttendance.js";
import { muallimAttendanceService } from "./muallimAttendance.service.js";

const envPath = path.resolve(process.cwd(), "backend/.env");
dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
const uri = process.env.MONGO_URI!;

test("End-to-End Database Integration: Shift-based Muallim Attendance", async (t) => {
  await mongoose.connect(uri);

  // 1. Verify index on MuallimAttendance
  await MuallimAttendance.init(); // ensure indexes are created
  const indexes = await MuallimAttendance.collection.indexes();
  const hasCompoundIndex = indexes.some(
    (idx) =>
      idx.key &&
      idx.key.userId === 1 &&
      idx.key.date === 1 &&
      idx.key.shiftId === 1 &&
      idx.unique === true
  );
  assert.equal(hasCompoundIndex, true, "Compound unique index { userId: 1, date: 1, shiftId: 1 } must exist");

  // 2. Find or pick active teacher for test
  const activeTeachers = await User.find({
    role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
    isActive: true,
  }).limit(2);

  assert(activeTeachers.length > 0, "At least one active teacher must exist in DB");
  const teacherA = activeTeachers[0];
  const testDate = "2029-12-31"; // Use future date for test isolation
  const targetDateUtc = muallimAttendanceService.normalizeDate(testDate);

  try {
    // Clean any prior test data for this test date
    await MuallimAttendance.deleteMany({ date: targetDateUtc });

    // Step A: Save initial attendance for Teacher A: Shift 1 = PRESENT, Shift 2 = CL, Shift 3 unrecorded
    await muallimAttendanceService.saveBulkAttendance(
      {
        date: testDate,
        records: [
          { userId: teacherA._id.toString(), shiftId: "SHIFT_1", status: "PRESENT" },
          { userId: teacherA._id.toString(), shiftId: "SHIFT_2", status: "CL" },
          { userId: teacherA._id.toString(), shiftId: "SHIFT_3", status: "" },
        ],
      },
      teacherA._id.toString()
    );

    // Verify stored records
    const recordsAfterStepA = await MuallimAttendance.find({
      userId: teacherA._id,
      date: targetDateUtc,
    }).lean();

    assert.equal(recordsAfterStepA.length, 2, "Only Shift 1 and Shift 2 should be stored (Shift 3 is unrecorded)");
    const s1 = recordsAfterStepA.find((r) => r.shiftId === "SHIFT_1");
    const s2 = recordsAfterStepA.find((r) => r.shiftId === "SHIFT_2");
    assert.equal(s1?.status, "PRESENT");
    assert.equal(s2?.status, "CL");

    // Step B: Update only Shift 1 to LLP. Shift 2 must remain CL!
    await muallimAttendanceService.saveBulkAttendance(
      {
        date: testDate,
        records: [
          { userId: teacherA._id.toString(), shiftId: "SHIFT_1", status: "LLP" },
        ],
      },
      teacherA._id.toString()
    );

    const recordsAfterStepB = await MuallimAttendance.find({
      userId: teacherA._id,
      date: targetDateUtc,
    }).lean();

    const s1Updated = recordsAfterStepB.find((r) => r.shiftId === "SHIFT_1");
    const s2Untouched = recordsAfterStepB.find((r) => r.shiftId === "SHIFT_2");
    assert.equal(s1Updated?.status, "LLP", "Shift 1 should be updated to LLP");
    assert.equal(s2Untouched?.status, "CL", "Shift 2 must remain untouched as CL");

    // Step C: Declare Shift Holiday on SHIFT_3
    await muallimAttendanceService.declareShiftHoliday(
      testDate,
      "SHIFT_3",
      "Special Evening Holiday",
      teacherA._id.toString()
    );

    const recordsAfterStepC = await MuallimAttendance.find({
      userId: teacherA._id,
      date: targetDateUtc,
    }).lean();

    assert.equal(recordsAfterStepC.length, 3, "All 3 shifts should now exist");
    const s3Holiday = recordsAfterStepC.find((r) => r.shiftId === "SHIFT_3");
    assert.equal(s3Holiday?.status, "HOLIDAY");
    assert.equal(s3Holiday?.holidayReason, "Special Evening Holiday");
    // Verify Shift 1 and Shift 2 are still LLP and CL
    assert.equal(recordsAfterStepC.find((r) => r.shiftId === "SHIFT_1")?.status, "LLP");
    assert.equal(recordsAfterStepC.find((r) => r.shiftId === "SHIFT_2")?.status, "CL");

    // Step D: Declare Full Day Holiday
    await muallimAttendanceService.declareFullDayHoliday(
      testDate,
      "Madrasa Annual Day",
      teacherA._id.toString()
    );

    const recordsAfterStepD = await MuallimAttendance.find({
      userId: teacherA._id,
      date: targetDateUtc,
    }).lean();

    assert.equal(recordsAfterStepD.length, 3);
    assert.equal(recordsAfterStepD.every((r) => r.status === "HOLIDAY"), true, "All 3 shifts must be HOLIDAY");
    assert.equal(
      recordsAfterStepD.every((r) => r.holidayReason === "Madrasa Annual Day"),
      true,
      "All 3 shifts must have holidayReason set"
    );

    // Step E: Individual attendance can still be edited after bulk holiday
    // When changing status from HOLIDAY to PRESENT, holidayReason must be cleared to null
    await muallimAttendanceService.saveBulkAttendance(
      {
        date: testDate,
        records: [
          { userId: teacherA._id.toString(), shiftId: "SHIFT_1", status: "PRESENT" },
        ],
      },
      teacherA._id.toString()
    );

    const s1Overridden = await MuallimAttendance.findOne({
      userId: teacherA._id,
      date: targetDateUtc,
      shiftId: "SHIFT_1",
    });
    assert.equal(s1Overridden?.status, "PRESENT", "Shift 1 can be edited back to PRESENT");
    assert.equal(s1Overridden?.holidayReason, null, "holidayReason must be cleared to null when status changes to PRESENT");

    // Step E2: Individual Holiday with specific reason
    await muallimAttendanceService.saveBulkAttendance(
      {
        date: testDate,
        records: [
          {
            userId: teacherA._id.toString(),
            shiftId: "SHIFT_1",
            status: "HOLIDAY",
            holidayReason: "Family Function Event",
          },
        ],
      },
      teacherA._id.toString()
    );

    const s1IndividualHoliday = await MuallimAttendance.findOne({
      userId: teacherA._id,
      date: targetDateUtc,
      shiftId: "SHIFT_1",
    });
    assert.equal(s1IndividualHoliday?.status, "HOLIDAY");
    assert.equal(s1IndividualHoliday?.holidayReason, "Family Function Event");

    // Revert Shift 1 back to PRESENT for Step F calculations
    await muallimAttendanceService.saveBulkAttendance(
      {
        date: testDate,
        records: [
          { userId: teacherA._id.toString(), shiftId: "SHIFT_1", status: "PRESENT" },
        ],
      },
      teacherA._id.toString()
    );

    // Step F: Test monthly report generation
    const monthlyReport = await muallimAttendanceService.getMonthlyReport(
      2029,
      12,
      teacherA._id.toString()
    );

    assert.equal(monthlyReport.year, 2029);
    assert.equal(monthlyReport.month, 12);
    assert.equal(monthlyReport.summaries.length, 1);
    const teacherSummary = monthlyReport.summaries[0];
    assert.equal(teacherSummary.stats.presentShifts, 1);
    assert.equal(teacherSummary.stats.holidayShifts, 2);
    assert.equal(teacherSummary.stats.presentDayEquivalent, 0.33);
    assert.equal(teacherSummary.stats.holidayDayEquivalent, 0.67);
    assert.equal(teacherSummary.stats.attendancePercentage, 100.0); // 1 present out of 1 scheduled = 100%

    // Step G: Test PDF Generation
    const fullPdf = await muallimAttendanceService.exportMonthlyPdf(2029, 12);
    assert(Buffer.isBuffer(fullPdf), "Full monthly register PDF should be a buffer");
    assert(fullPdf.length > 500, "Full monthly register PDF buffer should not be empty");
    assert.equal(fullPdf.subarray(0, 4).toString(), "%PDF", "Must start with %PDF");

    const individualPdf = await muallimAttendanceService.exportMonthlyPdf(
      2029,
      12,
      teacherA._id.toString()
    );
    assert(Buffer.isBuffer(individualPdf), "Individual PDF should be a buffer");
    assert(individualPdf.length > 500, "Individual PDF buffer should not be empty");
    assert.equal(individualPdf.subarray(0, 4).toString(), "%PDF", "Must start with %PDF");

  } finally {
    // Clean up test data
    await MuallimAttendance.deleteMany({ date: targetDateUtc });
    await mongoose.disconnect();
  }
});
