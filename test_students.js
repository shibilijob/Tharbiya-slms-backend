import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

async function checkStudents() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const students = await db.collection("students").find({}).toArray();
  console.log("Total students in DB:", students.length);

  let noIsActive = 0;
  let isActiveFalse = 0;
  let stringClassId = 0;
  let objectClassId = 0;

  for (const s of students) {
    if (s.isActive === undefined) noIsActive++;
    if (s.isActive === false) isActiveFalse++;
    if (typeof s.classId === "string") stringClassId++;
    if (s.classId instanceof mongoose.Types.ObjectId) objectClassId++;
  }

  console.log({
    total: students.length,
    noIsActive,
    isActiveFalse,
    stringClassId,
    objectClassId,
  });

  await mongoose.disconnect();
}

checkStudents().catch(console.error);

