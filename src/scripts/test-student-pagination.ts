import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { sadhrService } from "../modules/sadhr/index.js";
import Student from "../models/Student.js";
import Class from "../models/Class.js";
import User from "../models/User.js";

async function runStudentPaginationTests() {
  console.log("🚀 Running Student Pagination Verification Test (Limit: 20)...\n");

  try {
    await connectDB();

    // 1. Setup mock parent, teacher, class if needed
    let parent = await User.findOne({ role: "PARENT", isActive: true });
    if (!parent) {
      parent = await User.create({
        name: "Test Parent Pagination",
        phone: "9800000001",
        role: "PARENT",
        isActive: true,
      });
    }

    let teacher = await User.findOne({ role: "MUALLIM", isActive: true });
    if (!teacher) {
      teacher = await User.create({
        name: "Usthad Pagination",
        phone: "9800000002",
        role: "MUALLIM",
        isActive: true,
      });
    }

    let classDoc = await Class.findOne({ isActive: true });
    if (!classDoc) {
      classDoc = await Class.create({
        name: "Class 5 Test",
        division: "A",
        isActive: true,
      });
    }

    // Clean previous pagination test students
    await Student.deleteMany({ admissionNumber: /^PAG-TEST-/ });

    // 2. Insert 25 test students
    console.log("📝 Inserting 25 test students...");
    const testDocs = [];
    const dummyYearId = new mongoose.Types.ObjectId();
    for (let i = 1; i <= 25; i++) {
      testDocs.push({
        admissionNumber: `PAG-TEST-${String(i).padStart(3, "0")}`,
        name: `Pagination Student ${i}`,
        gender: i % 2 === 0 ? "FEMALE" : "MALE",
        parentId: parent._id,
        classId: classDoc._id,
        academicYearId: dummyYearId,
        isActive: true,
      });
    }
    await Student.insertMany(testDocs);

    // 3. Test Page 1 with limit 20
    console.log("1️⃣ Testing getAllStudents Page 1 (limit: 20)...");
    const page1 = await sadhrService.getAllStudents({ page: 1, limit: 20, search: "PAG-TEST" });
    console.log(`   Page 1 returned: ${page1.students.length} students`);
    console.log(`   Pagination metadata:`, page1.pagination);
    console.assert(page1.students.length === 20, `Expected 20 students on page 1, got ${page1.students.length}`);
    console.assert(page1.pagination.total === 25, `Expected total 25, got ${page1.pagination.total}`);
    console.assert(page1.pagination.totalPages === 2, `Expected totalPages 2, got ${page1.pagination.totalPages}`);
    console.assert(page1.pagination.page === 1, `Expected page 1, got ${page1.pagination.page}`);
    console.assert(page1.pagination.limit === 20, `Expected limit 20, got ${page1.pagination.limit}`);
    console.assert(page1.pagination.hasPrevPage === false, "Page 1 hasPrevPage must be false");
    console.assert(page1.pagination.hasNextPage === true, "Page 1 hasNextPage must be true");
    console.log("   ✅ Page 1 passed!\n");

    // 4. Test Page 2 with limit 20 (remainder 5)
    console.log("2️⃣ Testing getAllStudents Page 2 (limit: 20)...");
    const page2 = await sadhrService.getAllStudents({ page: 2, limit: 20, search: "PAG-TEST" });
    console.log(`   Page 2 returned: ${page2.students.length} students`);
    console.log(`   Pagination metadata:`, page2.pagination);
    console.assert(page2.students.length === 5, `Expected 5 students on page 2, got ${page2.students.length}`);
    console.assert(page2.pagination.page === 2, `Expected page 2, got ${page2.pagination.page}`);
    console.assert(page2.pagination.hasPrevPage === true, "Page 2 hasPrevPage must be true");
    console.assert(page2.pagination.hasNextPage === false, "Page 2 hasNextPage must be false");
    console.log("   ✅ Page 2 passed!\n");

    // 5. Cleanup test data
    await Student.deleteMany({ admissionNumber: /^PAG-TEST-/ });
    console.log("🧹 Cleaned up test data.");

    console.log("🎉 ALL STUDENT PAGINATION TESTS PASSED (100%)!\n");
  } catch (error) {
    console.error("❌ Test Failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runStudentPaginationTests();
