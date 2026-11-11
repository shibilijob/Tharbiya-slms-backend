import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), "backend/.env");
dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
const uri = process.env.MONGO_URI!;

import User from "../../models/User.js";
import MuallimAttendance from "../../models/MuallimAttendance.js";
import { issueSessionToken } from "../auth/sessionToken.js";
import { muallimAttendanceService } from "../muallimAttendance/muallimAttendance.service.js";

test("End-to-End Integration: Personal Muallim Attendance (Read-Only) & Security", async () => {
  const { default: app } = await import("../../app.js");
  await mongoose.connect(uri);

  // 1. Fetch two distinct active teachers
  const teachers = await User.find({
    role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
    isActive: true,
  }).limit(2);

  assert(teachers.length >= 2, "At least two active teachers required for security test");
  const teacherA = teachers[0];
  const teacherB = teachers[1];

  const tokenA = issueSessionToken(teacherA._id.toString());
  const tokenB = issueSessionToken(teacherB._id.toString());

  // Also create a parent user for role authorization test
  let parentUser = await User.findOne({ role: "PARENT", isActive: true });
  if (!parentUser) {
    parentUser = await User.create({
      name: "Test Parent Attend",
      phone: "9999988881",
      email: "testparentattend@darunnajath.edu",
      role: "PARENT",
      isActive: true,
    });
  }
  const parentToken = issueSessionToken(parentUser._id.toString());

  // 2. Start HTTP server on ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const testDate = "2029-10-15";
  const targetDateUtc = muallimAttendanceService.normalizeDate(testDate);

  try {
    // Clean prior test data for this date
    await MuallimAttendance.deleteMany({ date: targetDateUtc });

    // Seed test attendance record for Teacher A:
    // Shift 1: PRESENT, Shift 2: CL, Shift 3: HOLIDAY with reason
    await muallimAttendanceService.saveBulkAttendance(
      {
        date: testDate,
        records: [
          { userId: teacherA._id.toString(), shiftId: "SHIFT_1", status: "PRESENT" },
          { userId: teacherA._id.toString(), shiftId: "SHIFT_2", status: "CL" },
          {
            userId: teacherA._id.toString(),
            shiftId: "SHIFT_3",
            status: "HOLIDAY",
            holidayReason: "Annual Institution Dars Holiday",
          },
        ],
      },
      teacherA._id.toString()
    );

    // 1. Verify a MUALLIM can view their own attendance
    const resA = await fetch(`${baseUrl}/api/muallim/my-attendance?year=2029&month=10`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resA.status, 200, "Teacher A should receive 200 OK");
    const jsonA = await resA.json();
    assert.equal(jsonA.success, true);
    assert.equal(jsonA.data.muallim.id, teacherA._id.toString(), "Returned data must be for Teacher A");
    assert.equal(jsonA.data.year, 2029);
    assert.equal(jsonA.data.month, 10);

    // 2. Security Check: A MUALLIM cannot access another Muallim's records by tampering with query parameters
    const resTamper = await fetch(
      `${baseUrl}/api/muallim/my-attendance?year=2029&month=10&userId=${teacherB._id.toString()}`,
      {
        headers: { Authorization: `Bearer ${tokenA}` },
      }
    );
    assert.equal(resTamper.status, 200);
    const jsonTamper = await resTamper.json();
    assert.equal(
      jsonTamper.data.muallim.id,
      teacherA._id.toString(),
      "Must still return Teacher A data, completely ignoring query parameter userId"
    );

    // 3. Role Authorization: Unauthenticated & non-faculty access is rejected
    const resUnauth = await fetch(`${baseUrl}/api/muallim/my-attendance?year=2029&month=10`);
    assert.equal(resUnauth.status, 401, "Unauthenticated request must be 401");

    const resForbidden = await fetch(`${baseUrl}/api/muallim/my-attendance?year=2029&month=10`, {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    assert.equal(resForbidden.status, 403, "Non-faculty role must be 403 Forbidden");

    // 4 & 5. Verify all three shifts and holiday reasons appear correctly
    const day15 = jsonA.data.dailyRecords.find((r: any) => r.dayNumber === 15);
    assert(day15, "Day 15 record must exist in monthly dailyRecords");
    assert.equal(day15.shift1, "PRESENT", "Shift 1 must be PRESENT");
    assert.equal(day15.shift2, "CL", "Shift 2 must be CL");
    assert.equal(day15.shift3, "HOLIDAY", "Shift 3 must be HOLIDAY");
    assert.equal(
      day15.shift3Reason,
      "Annual Institution Dars Holiday",
      "Shift 3 must include holidayReason"
    );
    assert.equal(day15.shift1Reason, null, "Shift 1 (PRESENT) must not have a holiday reason");
    assert.equal(day15.shift2Reason, null, "Shift 2 (CL) must not have a holiday reason");

    // 6. Verify monthly calculations match the Institutional Report
    const stats = jsonA.data.stats;
    assert.equal(stats.presentShifts, 1);
    assert.equal(stats.clShifts, 1);
    assert.equal(stats.holidayShifts, 1);
    assert.equal(stats.totalScheduledShifts, 2, "Scheduled = Present (1) + CL (1) = 2");
    assert.equal(stats.presentDayEquivalent, 0.33, "Present day eq = 1 / 3 = 0.33");
    assert.equal(stats.clDayEquivalent, 0.33, "CL day eq = 1 / 3 = 0.33");
    assert.equal(stats.holidayDayEquivalent, 0.33, "Holiday day eq = 1 / 3 = 0.33");
    assert.equal(stats.attendancePercentage, 50.0, "Attendance % = (1 / 2) * 100 = 50.0%");

    // 7. Verify historical/empty month returns proper structure
    const resEmpty = await fetch(`${baseUrl}/api/muallim/my-attendance?year=2020&month=1`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resEmpty.status, 200);
    const jsonEmpty = await resEmpty.json();
    assert.equal(jsonEmpty.success, true);
    assert.equal(jsonEmpty.data.stats.presentShifts, 0);
    assert.equal(jsonEmpty.data.stats.totalScheduledShifts, 0);
    assert.equal(jsonEmpty.data.stats.attendancePercentage, 0);
    assert.equal(jsonEmpty.data.dailyRecords.length, 31, "January must have 31 days");

    // 8. PDF Export contains only authenticated Muallim's records
    const resPdf = await fetch(`${baseUrl}/api/muallim/my-attendance/export-pdf?year=2029&month=10`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resPdf.status, 200, "PDF export should succeed with 200 OK");
    assert.equal(resPdf.headers.get("content-type"), "application/pdf");
    const pdfArrayBuffer = await resPdf.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    assert(pdfBuffer.length > 500, "PDF buffer must contain content");
    assert.equal(pdfBuffer.subarray(0, 4).toString(), "%PDF", "Must start with %PDF magic bytes");

    // 9. Existing SADHR_MUALLIM attendance management continues to work
    const sadhrToken = issueSessionToken(teacherA._id.toString());
    const resInstitutional = await fetch(
      `${baseUrl}/api/institutional/muallim-attendance?date=${testDate}`,
      {
        headers: { Authorization: `Bearer ${sadhrToken}` },
      }
    );
    assert.equal(resInstitutional.status, 200, "Sadhr institutional attendance must continue working");

  } finally {
    await MuallimAttendance.deleteMany({ date: targetDateUtc });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
  }
});
