import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { muallimService } from "../modules/muallim/index.js";
import Class from "../models/Class.js";
import Subject from "../models/Subject.js";

async function runSubjectTests() {
  console.log("🚀 Running Academic Subject CRUD Verification Test...\n");

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
    const uniqueSubjectName = `Fiqh & Islamic Jurisprudence ${Date.now()}`;

    // 1. Test Add Subject
    console.log("1️⃣ Testing addSubject...");
    const createdSubject = await muallimService.addSubject({
      name: uniqueSubjectName,
      arabicTitle: "الفقه الإسلامي",
      malayalamTitle: "ഫിഖ്ഹ്",
      classId: testClassId,
    });

    console.log("✅ Created Subject:", {
      id: createdSubject.id,
      name: createdSubject.name,
      arabicTitle: createdSubject.arabicTitle,
      malayalamTitle: createdSubject.malayalamTitle,
      classId: createdSubject.classId,
      className: createdSubject.className,
      isActive: createdSubject.isActive,
    });

    if (!createdSubject.id || createdSubject.name !== uniqueSubjectName) {
      throw new Error("addSubject failed: Invalid returned data");
    }

    // 2. Test Get Subjects (all & by class)
    console.log("\n2️⃣ Testing getSubjects...");
    const subjectsForClass = await muallimService.getSubjects(testClassId);
    const found = subjectsForClass.some((s) => s.id === createdSubject.id);
    console.log(`✅ Fetched ${subjectsForClass.length} subjects for class. Newly created found: ${found}`);

    if (!found) {
      throw new Error("getSubjects failed: Subject not found in list");
    }

    // 3. Test Get Subject by ID
    console.log("\n3️⃣ Testing getSubjectById...");
    const retrieved = await muallimService.getSubjectById(createdSubject.id);
    console.log("✅ Retrieved Subject:", retrieved.name);

    if (retrieved.id !== createdSubject.id) {
      throw new Error("getSubjectById failed: ID mismatch");
    }

    // 4. Test Edit / Update Subject
    console.log("\n4️⃣ Testing updateSubject (Edit Subject)...");
    const updatedName = `${uniqueSubjectName} (Shafi'i Fiqh)`;
    const updated = await muallimService.updateSubject(createdSubject.id, {
      name: updatedName,
    });

    console.log("✅ Updated Subject:", {
      id: updated.id,
      name: updated.name,
    });

    if (updated.name !== updatedName) {
      throw new Error("updateSubject failed: Name not updated");
    }

    // 5. Test Remove Subject
    console.log("\n5️⃣ Testing removeSubject (Delete/Remove Subject)...");
    const removeResult = await muallimService.removeSubject(createdSubject.id);
    console.log("✅ Remove Result Message:", removeResult.message);

    // Verify DB state
    const dbRecord = await Subject.findById(createdSubject.id);
    console.log("DB Record found after delete:", dbRecord);

    if (dbRecord) {
      throw new Error("removeSubject failed: record was not deleted");
    }

    console.log("\n🎉 ALL ACADEMIC SUBJECT CRUD TESTS PASSED SUCCESSFULLY! 🌟\n");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runSubjectTests();
