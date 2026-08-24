import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { auth, mongoClient } from "../modules/auth/index.js";

const SEED_USERS = [
  {
    name: "Shihabudheen Saadi",
    email: "shihab@yopmail.com",
    phone: "0000000001",
    password: "shihab@yopmail.com",
    role: "SADHR_MUALLIM" as const,
    isActive: true,
    designation: "Sadhr Muallim (Sadhr Mudarris) & Class 7 Mentor",
    assignedClasses: JSON.stringify(["7", "6"]),
    assignedSubjects: JSON.stringify(["Fiqh", "Quran", "Islamic Studies"]),
  },
  {
    name: "Saidalavi Saadi",
    email: "saidalavi@yopmail.com",
    phone: "0000000002",
    password: "saidalavi@yopmail.com",
    role: "MUALLIM" as const,
    isActive: true,
    designation: "Senior Usthad & Hifz Section Supervisor",
    assignedClasses: JSON.stringify(["3", "4"]),
    assignedSubjects: JSON.stringify(["Hifz", "Quran", "Akhlaq"]),
  },
  {
    name: "Shibili Ahsani",
    email: "shibili@yopmail.com",
    phone: "0000000003",
    password: "shibili@yopmail.com",
    role: "MUALLIM" as const,
    isActive: true,
    designation: "Senior Usthad & Class 5 Mentor",
    assignedClasses: JSON.stringify(["5", "6"]),
    assignedSubjects: JSON.stringify(["Quran", "Hifz", "Tajweed", "Fiqh"]),
  },
  {
    name: "Misbahudheen Saqafi",
    email: "misbahudheen@yopmail.com",
    phone: "0000000004",
    password: "misbahudheen@yopmail.com",
    role: "MUALLIM" as const,
    isActive: true,
    designation: "Arabic & Islamic Studies Specialist",
    assignedClasses: JSON.stringify(["4", "5", "7"]),
    assignedSubjects: JSON.stringify(["Arabic", "Islamic Studies"]),
  },
];

async function seed() {
  console.log("🌱 Starting user seeding...");
  try {
    // 1. Connect Mongoose
    await connectDB();

    for (const userData of SEED_USERS) {
      // Seed Mongoose User model
      await User.findOneAndUpdate(
        { email: userData.email },
        {
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          password: userData.password,
          role: userData.role,
          isActive: userData.isActive,
        },
        { upsert: true, new: true }
      );
      console.log(`✅ [Mongoose] Synced User: ${userData.name} (${userData.role})`);

      // Seed Better Auth User
      try {
        const result = await auth.api.signUpEmail({
          body: {
            email: userData.email,
            password: userData.password,
            name: userData.name,
            username: userData.phone,
            role: userData.role === "SADHR_MUALLIM" ? "ADMIN" : "TEACHER",
            phone: userData.phone,
            designation: userData.designation,
            madrasaName: "Darunnajath Mundambra",
            assignedClasses: userData.assignedClasses,
            assignedSubjects: userData.assignedSubjects,
          },
        });

        if (result?.user) {
          console.log(`✅ [Better Auth] Registered: ${userData.name} (${userData.email})`);
        } else {
          console.log(`ℹ️ [Better Auth] User ${userData.email} already exists.`);
        }
      } catch (err: any) {
        if (
          err?.message?.includes("already exists") ||
          err?.code === "USER_ALREADY_EXISTS" ||
          err?.status === 422
        ) {
          console.log(`ℹ️ [Better Auth] User ${userData.email} already exists.`);
        } else {
          console.log(`⚠️ [Better Auth] Notice for ${userData.email}:`, err?.message || err);
        }
      }
    }

    console.log("🎉 All users seeded successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    await mongoClient.close();
    process.exit(0);
  }
}

seed();
