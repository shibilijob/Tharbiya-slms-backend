import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { muallimService } from "../modules/muallim/index.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Achievement from "../models/Achievement.js";

async function runAchievementTests() {
  console.log("🚀 Running Awards & Achievements CRUD Verification Test...\n");

  try {
    await connectDB();

    // 0. Ensure a test student & teacher exist
    let testTeacher = await User.findOne({ role: "MUALLIM", isActive: true });
    if (!testTeacher) {
      testTeacher = await User.create({
        name: "Usthad Shibili Test",
        phone: "9847111222",
        role: "MUALLIM",
        isActive: true,
      });
    }

    let testStudent = await Student.findOne({ isActive: true });
    if (!testStudent) {
      testStudent = await Student.create({
        name: "Ahmad Rayan Test",
        admissionNumber: `ADM-${Date.now()}`,
        gender: "MALE",
        parentId: testTeacher._id,
        isActive: true,
      });
    }

    const testStudentId = testStudent._id.toString();
    const testTeacherId = testTeacher._id.toString();
    const uniqueTitle = `Monthly Hifz Star Award ${Date.now()}`;

    // 1. Test Create Achievement / Award
    console.log("1️⃣ Testing createAchievement...");
    const createdAchievement = await muallimService.createAchievement(
      {
        studentId: testStudentId,
        title: uniqueTitle,
        titleMalayalam: "പ്രതിമാസ ഹിഫ്ള് താരം",
        category: "Weekly Hifz Completion",
        description: "Successfully completed memorization of Surah Al-Mulk with flawless Tajweed.",
        badgeIcon: "🌟",
      },
      testTeacherId
    );

    console.log("✅ Created Achievement / Award:", {
      id: createdAchievement.id,
      title: createdAchievement.title,
      studentId: createdAchievement.studentId,
      studentName: createdAchievement.studentName,
      badgeIcon: createdAchievement.badgeIcon,
      awardedByName: createdAchievement.awardedByName,
      isActive: createdAchievement.isActive,
    });

    if (!createdAchievement.id || createdAchievement.title !== uniqueTitle) {
      throw new Error("createAchievement failed: Invalid returned data");
    }

    // 2. Test Get Achievements (all & by student)
    console.log("\n2️⃣ Testing getAchievements...");
    const studentAchievements = await muallimService.getAchievements({ studentId: testStudentId });
    const found = studentAchievements.some((a) => a.id === createdAchievement.id);
    console.log(`✅ Fetched ${studentAchievements.length} achievements for student. Newly created found: ${found}`);

    if (!found) {
      throw new Error("getAchievements failed: Achievement not found in list");
    }

    // 3. Test Get Achievement by ID
    console.log("\n3️⃣ Testing getAchievementById...");
    const retrieved = await muallimService.getAchievementById(createdAchievement.id);
    console.log("✅ Retrieved Achievement:", retrieved.title);

    if (retrieved.id !== createdAchievement.id) {
      throw new Error("getAchievementById failed: ID mismatch");
    }

    // 4. Test Delete / Soft-delete Achievement
    console.log("\n4️⃣ Testing deleteAchievement...");
    const deleteResult = await muallimService.deleteAchievement(createdAchievement.id);
    console.log("✅ Delete Result Message:", deleteResult.message);

    // Verify DB state
    const dbRecord = await Achievement.findById(createdAchievement.id);
    console.log("DB Record isActive status:", dbRecord?.isActive);

    if (dbRecord?.isActive !== false) {
      throw new Error("deleteAchievement failed: isActive was not set to false");
    }

    // Clean up
    await Achievement.findByIdAndDelete(createdAchievement.id);
    console.log("🧹 Test record cleaned up.");

    console.log("\n🎉 ALL AWARDS & ACHIEVEMENTS CRUD TESTS PASSED SUCCESSFULLY! 🌟\n");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runAchievementTests();
