import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

import { practicalScoreService } from "./dist/modules/practical/practicalScore.service.js";

async function testSave() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB!");

  const db = mongoose.connection.db;

  // Class 4
  const cls = await db.collection("classes").findOne({ name: "Class 4" });
  console.log("Class:", cls._id);

  // Practical subjects
  const subjects = await db.collection("practicalsubjects").find({ classId: cls._id, isActive: true }).toArray();
  console.log("Subjects count:", subjects.length);

  // Students in Class 4
  const students = await db.collection("students").find({ classId: cls._id, isActive: true }).limit(3).toArray();
  console.log("Students count:", students.length);

  // Teacher Shihabudheen (SADHR_MUALLIM)
  const teacher = await db.collection("users").findOne({ name: "Shihabudheen Saadi" });
  console.log("Teacher:", teacher.name, "Role:", teacher.role, "Assigned:", teacher.assignedClasses);

  const payload = {
    classId: "4",
    month: 11,
    year: 2026,
    entries: [
      {
        studentId: students[0]._id.toString(),
        practicalSubjectId: subjects[0]._id.toString(),
        score: 4,
        remarks: "Good effort",
      },
      {
        studentId: students[1]._id.toString(),
        practicalSubjectId: subjects[0]._id.toString(),
        score: 5,
        remarks: "Excellent",
      },
    ],
  };

  console.log("\nCalling practicalScoreService.recordBulkMonthlyScores...");
  try {
    const result = await practicalScoreService.recordBulkMonthlyScores(payload, teacher._id.toString());
    console.log("Success! Saved docs count:", result.length);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("ERROR in recordBulkMonthlyScores:", err);
  }

  await mongoose.disconnect();
}

testSave().catch(console.error);
