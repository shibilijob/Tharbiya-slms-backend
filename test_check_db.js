import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

const MONGO_URI = process.env.MONGO_URI;

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB!");

  const db = mongoose.connection.db;

  const classes = await db.collection("classes").find({}).toArray();
  console.log("\n--- ALL CLASSES ---");
  console.log(JSON.stringify(classes.map(c => ({ id: c._id, name: c.name, isActive: c.isActive })), null, 2));

  const subjects = await db.collection("practicalsubjects").find({}).toArray();
  console.log("\n--- ALL PRACTICAL SUBJECTS ---");
  console.log(JSON.stringify(subjects.map(s => ({ id: s._id, name: s.name, classId: s.classId, isActive: s.isActive })), null, 2));

  for (const c of classes) {
    const sCount = await db.collection("students").countDocuments({ classId: c._id, isActive: true });
    const subCount = await db.collection("practicalsubjects").countDocuments({ classId: c._id, isActive: true });
    console.log(`Class: "${c.name}" (id: ${c._id}) -> Students: ${sCount}, PracticalSubjects: ${subCount}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
