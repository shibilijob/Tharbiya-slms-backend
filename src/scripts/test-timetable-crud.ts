import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { muallimService } from "../modules/muallim/index.js";
import Class from "../models/Class.js";
import TimetablePeriod from "../models/TimetablePeriod.js";

async function runTimetableTests() {
  console.log("🚀 Running Timetable Periods CRUD Verification Test...\n");

  try {
    await connectDB();

    // 0. Ensure a test class exists
    let testClass = await Class.findOne({ isActive: true });
    if (!testClass) {
      testClass = await Class.create({
        name: "Class 5 Test",
        division: "A",
        isActive: true,
      });
    }

    const testClassId = testClass._id.toString();

    // 1. Test Add Period
    console.log("1️⃣ Testing addPeriod...");
    const createdPeriod = await muallimService.addPeriod({
      classId: testClassId,
      day: "Sunday",
      periodNumber: 1,
      startTime: "07:00 AM",
      endTime: "07:45 AM",
      subject: "Quran Recitation & Tilawat",
      subjectMalayalam: "ഖുർആൻ പാരായണം",
      teacherName: "Usthad Shihabudheen Saadi",
      room: "Dars Hall 5A",
      notes: "Surah Al-Mulk recitation and Makhraj practice",
    });

    console.log("✅ Created Timetable Period:", {
      id: createdPeriod.id,
      day: createdPeriod.day,
      periodNumber: createdPeriod.periodNumber,
      subject: createdPeriod.subject,
      time: `${createdPeriod.startTime} - ${createdPeriod.endTime}`,
      room: createdPeriod.room,
      isActive: createdPeriod.isActive,
    });

    if (!createdPeriod.id || createdPeriod.periodNumber !== 1) {
      throw new Error("addPeriod failed: Invalid returned data");
    }

    // 2. Test Get Periods (all & by class / day)
    console.log("\n2️⃣ Testing getPeriods...");
    const periods = await muallimService.getPeriods({ classId: testClassId, day: "Sunday" });
    const found = periods.some((p) => p.id === createdPeriod.id);
    console.log(`✅ Fetched ${periods.length} periods for Sunday. Newly created found: ${found}`);

    if (!found) {
      throw new Error("getPeriods failed: Period not found in list");
    }

    // 3. Test Get Period by ID
    console.log("\n3️⃣ Testing getPeriodById...");
    const retrieved = await muallimService.getPeriodById(createdPeriod.id);
    console.log("✅ Retrieved Period:", `${retrieved.day} Period ${retrieved.periodNumber} - ${retrieved.subject}`);

    if (retrieved.id !== createdPeriod.id) {
      throw new Error("getPeriodById failed: ID mismatch");
    }

    // 4. Test Edit / Update Period
    console.log("\n4️⃣ Testing updatePeriod (Edit Period)...");
    const updated = await muallimService.updatePeriod(createdPeriod.id, {
      subject: "Advanced Tajweed & Tilawat",
      startTime: "07:05 AM",
      endTime: "07:50 AM",
      room: "Main Prayer Hall",
    });

    console.log("✅ Updated Period:", {
      id: updated.id,
      subject: updated.subject,
      time: `${updated.startTime} - ${updated.endTime}`,
      room: updated.room,
    });

    if (updated.subject !== "Advanced Tajweed & Tilawat" || updated.room !== "Main Prayer Hall") {
      throw new Error("updatePeriod failed: Properties did not update correctly");
    }

    // 5. Test Delete Period (Soft delete)
    console.log("\n5️⃣ Testing deletePeriod (Delete Period)...");
    const deleteResult = await muallimService.deletePeriod(createdPeriod.id);
    console.log("✅ Delete Result Message:", deleteResult.message);

    // Verify DB state
    const dbRecord = await TimetablePeriod.findById(createdPeriod.id);
    console.log("DB Record isActive status:", dbRecord?.isActive);

    if (dbRecord?.isActive !== false) {
      throw new Error("deletePeriod failed: isActive was not set to false");
    }

    // Clean up
    await TimetablePeriod.findByIdAndDelete(createdPeriod.id);
    console.log("🧹 Test record cleaned up.");

    console.log("\n🎉 ALL TIMETABLE PERIODS CRUD TESTS PASSED SUCCESSFULLY! 🌟\n");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTimetableTests();
