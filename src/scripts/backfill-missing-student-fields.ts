import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import AcademicYear from "../models/AcademicYear.js";

async function backfill() {
  await connectDB();
  console.log("Connected to MongoDB.");

  let defaultParent = await User.findOne({ role: "PARENT", isActive: true });
  if (!defaultParent) {
    defaultParent = await User.create({
      name: "Ali Mundambra",
      phone: "+91 98471 23456",
      role: "PARENT",
      isActive: true,
    });
  }

  let year = await AcademicYear.findOne({ isActive: true });
  if (!year) {
    year = await AcademicYear.create({
      name: "2025-2026",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2026-03-31"),
      isActive: true,
    });
  }

  const res1 = await Student.updateMany(
    { $or: [{ parentId: { $exists: false } }, { parentId: null }] },
    { $set: { parentId: defaultParent._id } }
  );
  console.log(`Updated ${res1.modifiedCount} students with default parentId.`);

  const res2 = await Student.updateMany(
    { $or: [{ academicYearId: { $exists: false } }, { academicYearId: null }] },
    { $set: { academicYearId: year._id } }
  );
  console.log(`Updated ${res2.modifiedCount} students with default academicYearId.`);

  console.log("Backfill completed successfully.");
  await mongoose.disconnect();
}

backfill().catch(console.error);
