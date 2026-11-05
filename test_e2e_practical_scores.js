import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });
import mongoose from "mongoose";
import { issueSessionToken } from "./dist/modules/auth/sessionToken.js";

const MONGO_URI = process.env.MONGO_URI;

async function runE2ETest() {
  console.log("=== STARTING PRACTICAL SCORES E2E VERIFICATION ===");
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const teacherId = "6a8956ef0670feaf2506899f"; // Shibili Ahsani
  const token = issueSessionToken(teacherId);

  // 1. Get Class 4 info
  const classDoc = await db.collection("classes").findOne({ name: /4/ });
  if (!classDoc) throw new Error("Class 4 not found");
  console.log(`Class 4 found: ${classDoc._id}`);

  // 2. Get practical subjects for Class 4
  const practicalSubjects = await db.collection("practicalsubjects").find({ classId: classDoc._id, isActive: true }).toArray();
  console.log(`Found ${practicalSubjects.length} practical subjects for Class 4:`, practicalSubjects.map(s => s.name));
  if (practicalSubjects.length < 2) {
    throw new Error("Need at least 2 practical subjects for test");
  }
  const sub1 = practicalSubjects[0];
  const sub2 = practicalSubjects[1];

  // 3. Get 3 active students
  const students = await db.collection("students").find({ classId: classDoc._id, isActive: true }).limit(3).toArray();
  console.log(`Found ${students.length} students:`, students.map(s => s.name));
  if (students.length < 3) {
    throw new Error("Need at least 3 students for test");
  }

  const s1 = students[0];
  const s2 = students[1];
  const s3 = students[2];

  // Clean up any test records for month 11 & 12 of year 2026 for these students
  await db.collection("practicalscores").deleteMany({
    studentId: { $in: [s1._id, s2._id, s3._id] },
    year: 2026,
    month: { $in: [11, 12] },
  });
  console.log("Cleaned test baseline in practicalscores");

  // TEST 1 & 2: Enter marks for 3 students across 2 practical subjects (6 entries total) for Month 11
  console.log("\n--- TEST 1 & 2: Bulk Save 6 entries for Month 11 ---");
  const payloadMonth11 = {
    classId: "4",
    month: 11,
    year: 2026,
    entries: [
      { studentId: s1._id.toString(), practicalSubjectId: sub1._id.toString(), score: 4, remarks: "S1 Sub1" },
      { studentId: s2._id.toString(), practicalSubjectId: sub1._id.toString(), score: 3.5, remarks: "S2 Sub1" },
      { studentId: s3._id.toString(), practicalSubjectId: sub1._id.toString(), score: 5, remarks: "S3 Sub1" },
      { studentId: s1._id.toString(), practicalSubjectId: sub2._id.toString(), score: 4.5, remarks: "S1 Sub2" },
      { studentId: s2._id.toString(), practicalSubjectId: sub2._id.toString(), score: 4, remarks: "S2 Sub2" },
      { studentId: s3._id.toString(), practicalSubjectId: sub2._id.toString(), score: 3, remarks: "S3 Sub2" },
    ],
  };

  const saveRes11 = await fetch("http://localhost:5000/api/muallim/practical-scores/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payloadMonth11),
  });

  const saveJson11 = await saveRes11.json();
  console.log("Save Month 11 Status:", saveRes11.status);
  console.log("Save Month 11 Result count:", saveJson11.data?.length, "Success:", saveJson11.success);
  if (saveRes11.status !== 200 || !saveJson11.success || saveJson11.data?.length !== 6) {
    throw new Error(`Failed to bulk save: ${JSON.stringify(saveJson11)}`);
  }

  // TEST 3: Verify MongoDB persistence
  console.log("\n--- TEST 3: Verify MongoDB Persistence ---");
  const dbRecords11 = await db.collection("practicalscores").find({
    studentId: { $in: [s1._id, s2._id, s3._id] },
    year: 2026,
    month: 11,
  }).toArray();
  console.log(`Found ${dbRecords11.length} records in MongoDB for Month 11 (Expected: 6)`);
  if (dbRecords11.length !== 6) {
    throw new Error(`Expected 6 MongoDB records, found ${dbRecords11.length}`);
  }
  for (const r of dbRecords11) {
    console.log(`  - Record: student=${r.studentId}, subject=${r.practicalSubjectId}, score=${r.score}, maxScore=${r.maxScore}, classId=${r.classId}`);
  }

  // TEST 4: Query via GET /api/muallim/practical-scores
  console.log("\n--- TEST 4: Query via GET /api/muallim/practical-scores ---");
  const getRes11 = await fetch("http://localhost:5000/api/muallim/practical-scores?classId=4&month=11&year=2026", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const getJson11 = await getRes11.json();
  console.log("GET Month 11 Status:", getRes11.status, "Retrieved count:", getJson11.data?.length);
  if (getRes11.status !== 200 || !getJson11.success || getJson11.data?.length < 6) {
    throw new Error(`Failed to retrieve scores: ${JSON.stringify(getJson11)}`);
  }

  // TEST 5: Update existing mark without duplicates (Upsert check)
  console.log("\n--- TEST 5: Update S1 Sub1 score from 4 to 5 (Upsert Check) ---");
  const updatePayload = {
    classId: "4",
    month: 11,
    year: 2026,
    entries: [
      { studentId: s1._id.toString(), practicalSubjectId: sub1._id.toString(), score: 5, remarks: "Updated score" },
    ],
  };

  const updateRes = await fetch("http://localhost:5000/api/muallim/practical-scores/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updatePayload),
  });
  const updateJson = await updateRes.json();
  console.log("Update Status:", updateRes.status, "Success:", updateJson.success);

  // Check MongoDB count after update
  const dbRecordsAfterUpdate = await db.collection("practicalscores").find({
    studentId: { $in: [s1._id, s2._id, s3._id] },
    year: 2026,
    month: 11,
  }).toArray();
  console.log(`Records in MongoDB after update: ${dbRecordsAfterUpdate.length} (Expected: still 6, NO duplicates)`);
  if (dbRecordsAfterUpdate.length !== 6) {
    throw new Error(`Duplicate records created! Found ${dbRecordsAfterUpdate.length}`);
  }
  const updatedS1Sub1 = dbRecordsAfterUpdate.find(r => r.studentId.toString() === s1._id.toString() && r.practicalSubjectId.toString() === sub1._id.toString());
  console.log(`Updated S1 Sub1 score in MongoDB: ${updatedS1Sub1.score} (Expected: 5)`);
  if (updatedS1Sub1.score !== 5) {
    throw new Error(`Score was not updated to 5, got ${updatedS1Sub1.score}`);
  }

  // TEST 6: Month Isolation (December marks must not overwrite November marks)
  console.log("\n--- TEST 6: Month Isolation (December 2026) ---");
  const payloadMonth12 = {
    classId: "4",
    month: 12,
    year: 2026,
    entries: [
      { studentId: s1._id.toString(), practicalSubjectId: sub1._id.toString(), score: 2.5, remarks: "Dec S1 Sub1" },
      { studentId: s2._id.toString(), practicalSubjectId: sub1._id.toString(), score: 3.0, remarks: "Dec S2 Sub1" },
    ],
  };

  const saveRes12 = await fetch("http://localhost:5000/api/muallim/practical-scores/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payloadMonth12),
  });
  const saveJson12 = await saveRes12.json();
  console.log("Save Month 12 Status:", saveRes12.status, "Count:", saveJson12.data?.length);

  // Verify Month 11 records are still 6 and unchanged
  const dbRecordsMonth11Check = await db.collection("practicalscores").find({
    studentId: { $in: [s1._id, s2._id, s3._id] },
    year: 2026,
    month: 11,
  }).toArray();
  const dbRecordsMonth12Check = await db.collection("practicalscores").find({
    studentId: { $in: [s1._id, s2._id, s3._id] },
    year: 2026,
    month: 12,
  }).toArray();

  console.log(`Month 11 records: ${dbRecordsMonth11Check.length} (Expected: 6)`);
  console.log(`Month 12 records: ${dbRecordsMonth12Check.length} (Expected: 2)`);
  if (dbRecordsMonth11Check.length !== 6 || dbRecordsMonth12Check.length !== 2) {
    throw new Error("Month isolation failed!");
  }

  console.log("\n=== ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  await mongoose.disconnect();
}

runE2ETest().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});

