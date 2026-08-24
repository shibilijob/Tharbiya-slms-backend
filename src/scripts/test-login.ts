import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Class from "../models/Class.js";
import { authService } from "../modules/auth/auth.service.js";

async function runTests() {
  console.log("🚀 Starting verification for Role-Specific Login (Muallim & Sadhr via Email, Parent via Phone)...");

  try {
    await connectDB();
    console.log("✅ Database connected.");

    // 1. Seed or ensure test users exist in Mongoose
    const testSadhr = await User.findOneAndUpdate(
      { email: "shihab@yopmail.com" },
      {
        name: "Shihabudheen Saadi",
        email: "shihab@yopmail.com",
        phone: "0000000001",
        password: "shihab@yopmail.com",
        role: "SADHR_MUALLIM",
        isActive: true,
      },
      { returnDocument: "after", upsert: true }
    );

    const testMuallim = await User.findOneAndUpdate(
      { email: "shibili@yopmail.com" },
      {
        name: "Shibili Ahsani",
        email: "shibili@yopmail.com",
        phone: "0000000003",
        password: "shibili@yopmail.com",
        role: "MUALLIM",
        isActive: true,
      },
      { returnDocument: "after", upsert: true }
    );

    const testParent = await User.findOneAndUpdate(
      { phone: "9847123456" },
      {
        name: "Ali Mundambra",
        email: "ali.mundambra@gmail.com",
        phone: "9847123456",
        password: "123456",
        role: "PARENT",
        isActive: true,
      },
      { returnDocument: "after", upsert: true }
    );

    // Ensure a test class and student linked to parent
    const testClass = await Class.findOneAndUpdate(
      { name: "Class 5" },
      { name: "Class 5", division: "A", classTeacherId: testMuallim._id, isActive: true },
      { returnDocument: "after", upsert: true }
    );

    const dummyYearId = new mongoose.Types.ObjectId();

    await Student.findOneAndUpdate(
      { admissionNumber: "DN-2026-001" },
      {
        admissionNumber: "DN-2026-001",
        name: "Muhammad Ali",
        gender: "MALE",
        parentId: testParent._id,
        classId: testClass._id,
        academicYearId: dummyYearId,
        isActive: true,
      },
      { returnDocument: "after", upsert: true }
    );

    console.log("✅ Seed/Mock test records prepared.\n");

    // -------------------------------------------------------------
    // Test 1: Unified Staff Login (Muallim) via Email and Password
    // -------------------------------------------------------------
    console.log("--- Test 1: Unified Staff Login (Muallim) ---");
    const muallimRes = await authService.loginStaff({
      email: "shibili@yopmail.com",
      password: "shibili@yopmail.com",
    });
    console.log("Muallim Login Result:", {
      success: muallimRes.success,
      role: muallimRes.user.role,
      name: muallimRes.user.name,
      email: muallimRes.user.email,
      assignedClasses: muallimRes.user.assignedClasses,
      assignedSubjects: muallimRes.user.assignedSubjects,
    });
    if (muallimRes.user.role !== "MUALLIM") throw new Error("Muallim role mismatch");
    console.log("✅ Test 1 Passed.\n");

    // -------------------------------------------------------------
    // Test 2: Unified Staff Login (Sadhr Muallim) via Email and Password
    // -------------------------------------------------------------
    console.log("--- Test 2: Unified Staff Login (Sadhr Muallim) ---");
    const sadhrRes = await authService.loginStaff({
      email: "shihab@yopmail.com",
      password: "shihab@yopmail.com",
    });
    console.log("Sadhr Muallim Login Result:", {
      success: sadhrRes.success,
      role: sadhrRes.user.role,
      name: sadhrRes.user.name,
      email: sadhrRes.user.email,
      designation: (sadhrRes.user as any).designation,
      isSadhr: (sadhrRes.user as any).isSadhr,
    });
    if (sadhrRes.user.role !== "SADHR_MUALLIM") throw new Error("Sadhr role mismatch");
    console.log("✅ Test 2 Passed.\n");

    // -------------------------------------------------------------
    // Test 3: Parent Login via Phone Number and Password
    // -------------------------------------------------------------
    console.log("--- Test 3: Parent Login via Phone Number + Password ---");
    const parentRes = await authService.loginParent({
      phone: "9847123456",
      password: "123456",
    });
    console.log("Parent Login Result:", {
      success: parentRes.success,
      role: parentRes.user.role,
      name: parentRes.user.name,
      phone: parentRes.user.phone,
      childrenCount: parentRes.user.children.length,
      children: parentRes.user.children,
    });
    if (parentRes.user.role !== "PARENT") throw new Error("Parent role mismatch");
    if (parentRes.user.children.length === 0) throw new Error("Parent children not populated");
    console.log("✅ Test 3 Passed.\n");

    // -------------------------------------------------------------
    // Test 4: Role Mismatch Protection
    // -------------------------------------------------------------
    console.log("--- Test 4: Role Mismatch Protection ---");
    let caughtRoleError = false;
    try {
      // Trying to login as Sadhr with teacher's email
      await authService.loginSadhrMuallim({
        email: "shibili@yopmail.com",
        password: "shibili@yopmail.com",
      });
    } catch (err: any) {
      caughtRoleError = true;
      console.log("Correctly rejected unauthorized role:", err.message);
    }
    if (!caughtRoleError) throw new Error("Role protection failed to reject unauthorized access");
    console.log("✅ Test 4 Passed.\n");

    // -------------------------------------------------------------
    // Test 5: Invalid Password Rejection
    // -------------------------------------------------------------
    console.log("--- Test 5: Invalid Password Rejection ---");
    let caughtPwdError = false;
    try {
      await authService.loginParent({
        phone: "9847123456",
        password: "wrongpassword",
      });
    } catch (err: any) {
      caughtPwdError = true;
      console.log("Correctly rejected invalid password:", err.message);
    }
    if (!caughtPwdError) throw new Error("Invalid password was not rejected");
    console.log("✅ Test 5 Passed.\n");

    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Test execution failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
