import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { muallimService } from "../modules/muallim/index.js";
import Class from "../models/Class.js";
import PracticalSubject from "../models/PracticalSubject.js";

async function runPracticalSubjectTests() {
  console.log("🚀 Running Practical Subject CRUD Verification Test...\n");

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
    const uniqueSubjectName = `Salah & Taharah Practical ${Date.now()}`;

    // 1. Test Add Practical Subject
    console.log("1️⃣ Testing addPracticalSubject...");
    const createdSubject = await muallimService.addPracticalSubject({
      name: uniqueSubjectName,
      classId: testClassId,
    });

    console.log("✅ Created Practical Subject:", {
      id: createdSubject.id,
      name: createdSubject.name,
      classId: createdSubject.classId,
      className: createdSubject.className,
      isActive: createdSubject.isActive,
    });

    if (!createdSubject.id || createdSubject.name !== uniqueSubjectName) {
      throw new Error("addPracticalSubject failed: Invalid returned data");
    }

    // 2. Test Get Practical Subjects (all & by class)
    console.log("\n2️⃣ Testing getPracticalSubjects...");
    const subjectsForClass = await muallimService.getPracticalSubjects(testClassId);
    const found = subjectsForClass.some((s) => s.id === createdSubject.id);
    console.log(`✅ Fetched ${subjectsForClass.length} practical subjects for class. Newly created found: ${found}`);

    if (!found) {
      throw new Error("getPracticalSubjects failed: Subject not found in list");
    }

    // 3. Test Get Practical Subject by ID
    console.log("\n3️⃣ Testing getPracticalSubjectById...");
    const retrieved = await muallimService.getPracticalSubjectById(createdSubject.id);
    console.log("✅ Retrieved Practical Subject:", retrieved.name);

    if (retrieved.id !== createdSubject.id) {
      throw new Error("getPracticalSubjectById failed: ID mismatch");
    }

    // 4. Test Update Practical Subject
    console.log("\n4️⃣ Testing updatePracticalSubject...");
    const updatedName = `${uniqueSubjectName} (Advanced)`;
    const updated = await muallimService.updatePracticalSubject(createdSubject.id, {
      name: updatedName,
    });

    console.log("✅ Updated Practical Subject:", {
      id: updated.id,
      name: updated.name,
    });

    if (updated.name !== updatedName) {
      throw new Error("updatePracticalSubject failed: Name not updated");
    }

    // 5. Test Remove Practical Subject (Soft delete)
    console.log("\n5️⃣ Testing removePracticalSubject...");
    const removeResult = await muallimService.removePracticalSubject(createdSubject.id);
    console.log("✅ Remove Result Message:", removeResult.message);

    // Verify DB state
    const dbRecord = await PracticalSubject.findById(createdSubject.id);
    console.log("DB Record isActive status:", dbRecord?.isActive);

    if (dbRecord?.isActive !== false) {
      throw new Error("removePracticalSubject failed: isActive was not set to false");
    }

    // Clean up
    await PracticalSubject.findByIdAndDelete(createdSubject.id);
    console.log("🧹 Test record cleaned up.");

    console.log("\n🎉 ALL PRACTICAL SUBJECT CRUD TESTS PASSED SUCCESSFULLY! 🌟\n");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runPracticalSubjectTests();
