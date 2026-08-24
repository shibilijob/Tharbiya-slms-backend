import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { parentService } from "../modules/parent/index.js";
import { muallimService } from "../modules/muallim/index.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Class from "../models/Class.js";
import Attendance from "../models/Attendance.js";
import HifzLog from "../models/Hifz.js";
import PracticalEvaluation from "../modules/practical/practical.model.js";
import Achievement from "../models/Achievement.js";
import TimetablePeriod from "../models/TimetablePeriod.js";

async function runParentTests() {
  console.log("🚀 Running Parent Module Functions Verification Test...\n");

  try {
    await connectDB();

    // 1. Setup / Lookup Test Data (Parent, Teacher, Class, Student)
    let testTeacher = await User.findOne({ role: "MUALLIM", isActive: true });
    if (!testTeacher) {
      testTeacher = await User.create({
        name: "Usthad Shihabudheen Test",
        phone: "9847999888",
        role: "MUALLIM",
        designation: "Usthad & Class Mentor",
        isActive: true,
      });
    }

    let testParent = await User.findOne({ role: "PARENT", isActive: true });
    if (!testParent) {
      testParent = await User.create({
        name: "Abdul Majeed Test Parent",
        phone: "9847123999",
        role: "PARENT",
        isActive: true,
      });
    }

    const testYearId = new mongoose.Types.ObjectId();

    let testClass = await Class.findOne({ isActive: true });
    if (!testClass) {
      testClass = await Class.create({
        name: "Class 5",
        division: "A",
        academicYearId: testYearId,
        classTeacherId: testTeacher._id,
        isActive: true,
      });
    }

    let testStudent = await Student.findOne({ parentId: testParent._id, isActive: true });
    if (!testStudent) {
      testStudent = await Student.create({
        admissionNumber: `ADM-${Date.now()}`,
        name: "Muhammad Bilal Test",
        gender: "MALE",
        dateOfBirth: new Date("2015-05-12"),
        parentId: testParent._id,
        classId: testClass._id,
        academicYearId: testYearId,
        isActive: true,
      });
    }

    const parentId = testParent._id.toString();
    const studentId = testStudent._id.toString();
    const classId = testClass._id.toString();
    const teacherId = testTeacher._id.toString();

    // Seed test data for child if empty
    await Attendance.create({
      studentId: testStudent._id,
      classId: testClass._id,
      markedById: testTeacher._id,
      date: new Date(),
      status: "PRESENT",
      remark: "On time with enthusiasm",
    });

    await HifzLog.create({
      studentId: testStudent._id,
      classId: testClass._id,
      teacherId: testTeacher._id,
      sessionType: "SABAQ",
      date: new Date(),
      surahNumber: 67,
      surahName: "Al-Mulk",
      fromAyah: 1,
      toAyah: 15,
      rating: 5,
      mistakesCount: 0,
      remarks: "Masha Allah, beautiful Tajweed recitation",
    });

    await PracticalEvaluation.create({
      studentId: testStudent._id,
      classId: testClass._id,
      evaluatedById: testTeacher._id,
      date: new Date(),
      scores: [
        { category: "SALAH", score: 10, remarks: "Excellent Ruku & Sujood" },
        { category: "WUDU", score: 9, remarks: "Clean execution" },
        { category: "ADAB", score: 9, remarks: "Respectful with peers" },
      ],
      overallScore: 9,
      overallRemarks: "Consistent discipline and enthusiasm",
    });

    await Achievement.create({
      studentId: testStudent._id,
      classId: testClass._id,
      title: "Star Reciter of the Month",
      titleMalayalam: "പ്രതിമാസ ഖുർആൻ താരം",
      category: "Quranic Excellence",
      description: "Demonstrated outstanding fluency and Tajweed precision.",
      badgeIcon: "🌟",
      date: new Date(),
      awardedById: testTeacher._id,
      isActive: true,
    });

    // Ensure a timetable period exists
    const existingPeriod = await TimetablePeriod.findOne({ classId: testClass._id, day: "Sunday", periodNumber: 1, isActive: true });
    if (!existingPeriod) {
      await TimetablePeriod.create({
        classId: testClass._id,
        day: "Sunday",
        periodNumber: 1,
        startTime: "07:00 AM",
        endTime: "07:45 AM",
        subject: "Quran",
        subjectMalayalam: "ഖുർആൻ പാരായണം",
        teacherName: testTeacher.name,
        teacherId: testTeacher._id,
        room: "Dars Hall 5A",
        isActive: true,
      });
    }

    console.log("--------------------------------------------------");
    console.log(`Testing with Parent: "${testParent.name}" (${parentId})`);
    console.log(`Testing with Child: "${testStudent.name}" (${studentId})`);
    console.log("--------------------------------------------------\n");

    // 1. Test getParentProfile
    console.log("1️⃣ Testing getParentProfile...");
    const parentProfile = await parentService.getParentProfile(parentId);
    console.log("✅ Parent Profile:", {
      id: parentProfile.id,
      name: parentProfile.name,
      phone: parentProfile.phone,
      madrasaName: parentProfile.madrasaName,
      childrenCount: parentProfile.children.length,
    });
    if (!parentProfile.id || parentProfile.children.length === 0) {
      throw new Error("getParentProfile failed: invalid profile or children list");
    }

    // 2. Test getParentChildren
    console.log("\n2️⃣ Testing getParentChildren...");
    const childrenList = await parentService.getParentChildren(parentId);
    const firstChild = childrenList[0];
    if (!firstChild) {
      throw new Error("getParentChildren failed: no children returned");
    }
    console.log(`✅ Fetched ${childrenList.length} children for parent. First child:`, {
      name: firstChild.name,
      admissionNumber: firstChild.admissionNumber,
      className: firstChild.className,
      teacherName: firstChild.teacherName,
    });
    if (!firstChild.id) {
      throw new Error("getParentChildren failed: invalid child ID");
    }

    // 3. Test getChildProfile
    console.log("\n3️⃣ Testing getChildProfile...");
    const childProfile = await parentService.getChildProfile(parentId, studentId);
    console.log("✅ Child Profile Data:", {
      name: childProfile.name,
      className: childProfile.className,
      teacherName: childProfile.teacherName,
      attendancePercentage: `${childProfile.attendancePercentage}%`,
      hifzCurrentSurah: childProfile.hifzSummary.currentSurah,
      practicalAverageScore: childProfile.practicalAverageScore,
      recentAchievementsCount: childProfile.recentAchievements.length,
    });
    if (!childProfile.id || childProfile.name !== testStudent.name) {
      throw new Error("getChildProfile failed");
    }

    // 4. Test getChildAttendance
    console.log("\n4️⃣ Testing getChildAttendance...");
    const childAttendance = await parentService.getChildAttendance(parentId, studentId);
    console.log("✅ Child Attendance:", {
      totalDays: childAttendance.summary.totalDays,
      presentDays: childAttendance.summary.presentDays,
      percentage: `${childAttendance.summary.percentage}%`,
      recordsCount: childAttendance.records.length,
    });
    if (!childAttendance.summary || childAttendance.records.length === 0) {
      throw new Error("getChildAttendance failed");
    }

    // 5. Test getChildHifzProgress
    console.log("\n5️⃣ Testing getChildHifzProgress...");
    const childHifz = await parentService.getChildHifzProgress(parentId, studentId);
    console.log("✅ Child Hifz Progress:", {
      currentSurah: childHifz.summary.currentSurah,
      totalMemorizedSurahs: childHifz.summary.totalMemorizedSurahs,
      logsCount: childHifz.logs.length,
      latestLogSurah: childHifz.logs[0]?.surahName,
    });
    if (!childHifz.summary || childHifz.logs.length === 0) {
      throw new Error("getChildHifzProgress failed");
    }

    // 6. Test getChildPracticalReport
    console.log("\n6️⃣ Testing getChildPracticalReport...");
    const childPractical = await parentService.getChildPracticalReport(parentId, studentId);
    console.log("✅ Child Practical Report:", {
      averageScore: childPractical.report.averageScore,
      categoriesCount: Object.keys(childPractical.report.categoryBreakdown || {}).length,
      evaluationsCount: childPractical.evaluations.length,
    });
    if (!childPractical.report || childPractical.evaluations.length === 0) {
      throw new Error("getChildPracticalReport failed");
    }

    // 7. Test getChildTimetable
    console.log("\n7️⃣ Testing getChildTimetable...");
    const childTimetable = await parentService.getChildTimetable(parentId, studentId);
    console.log("✅ Child Timetable Schedule:", {
      className: childTimetable.className,
      teacherName: childTimetable.teacherName,
      sundayPeriodsCount: childTimetable.schedules.Sunday.length,
      sundayFirstPeriodSubject: childTimetable.schedules.Sunday[0]?.subject,
    });
    if (!childTimetable.className || !childTimetable.schedules.Sunday) {
      throw new Error("getChildTimetable failed");
    }

    // 8. Test getChildAchievements
    console.log("\n8️⃣ Testing getChildAchievements...");
    const childAchievements = await parentService.getChildAchievements(parentId, studentId);
    console.log("✅ Child Awards & Achievements:", {
      totalCount: childAchievements.totalCount,
      latestAward: childAchievements.achievements[0]?.title,
      badgeIcon: childAchievements.achievements[0]?.badgeIcon,
    });
    if (childAchievements.totalCount === 0 || !childAchievements.achievements[0]?.title) {
      throw new Error("getChildAchievements failed");
    }

    console.log("\n🎉 ALL PARENT MODULE FUNCTIONS VERIFIED AND PASSED SUCCESSFULLY! 🌟\n");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runParentTests();
