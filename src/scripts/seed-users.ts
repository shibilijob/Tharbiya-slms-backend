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
    designation: "Sadhr Muallim (Sadhr Mudarris)",
    assignedClasses: JSON.stringify(["1", "8", "12"]),
  },
  {
    name: "Saidalavi Saadi",
    email: "saidalavi@yopmail.com",
    phone: "0000000002",
    password: "saidalavi@yopmail.com",
    role: "MUALLIM" as const,
    isActive: true,
    designation: "Senior Usthad & Hifz Section Supervisor",
    assignedClasses: JSON.stringify(["3", "7", "11"]),
  },
  {
    name: "Shibili Ahsani",
    email: "shibilijob@gmail.com",
    phone: "0000000003",
    password: "shibili@yopmail.com",
    role: "MUALLIM" as const,
    isActive: true,
    designation: "Senior Usthad & Class 4 Mentor",
    assignedClasses: JSON.stringify(["4", "6", "10"]),
  },
  {
    name: "Misbahudheen Saqafi",
    email: "misbahudheen@yopmail.com",
    phone: "0000000004",
    password: "misbahudheen@yopmail.com",
    role: "MUALLIM" as const,
    isActive: true,
    designation: "Arabic & Islamic Studies Specialist",
    assignedClasses: JSON.stringify(["2", "5", "9"]),
  },
  {
    name: "Ali Mundambra",
    email: "ali.mundambra@gmail.com",
    phone: "9847123456",
    password: "123456",
    role: "PARENT" as const,
    isActive: true,
    designation: "Parent / Guardian",
    assignedClasses: JSON.stringify([]),
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
          designation: userData.designation,
          assignedClasses: JSON.parse(userData.assignedClasses),
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
            role: userData.role,
            phone: userData.phone,
            designation: userData.designation,
            madrasaName: "Darunnajath Mundambra",
            assignedClasses: userData.assignedClasses,
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
