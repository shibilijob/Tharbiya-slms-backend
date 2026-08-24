import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { sadhrService } from "../modules/sadhr/sadhr.service.js";
import User from "../models/User.js";
import DeletedUser from "../models/DeletedUser.js";

async function runMuallimTests() {
  console.log("🚀 Running Sadhr Muallim CRUD Verification Test...\n");

  try {
    await connectDB();

    const testTimestamp = Date.now();
    const testPhone = `9847${testTimestamp.toString().slice(-6)}`;
    const testEmail = `usthad_test_${testTimestamp}@tharbiya.test`;

    // 1. Test Create Muallim
    console.log("1️⃣ Testing createMuallim...");
    const createdMuallim = await sadhrService.createMuallim({
      name: "Usthad Test Ibrahim",
      phone: testPhone,
      email: testEmail,
      role: "MUALLIM",
      designation: "Tajweed & Quran Specialist",
      assignedClasses: ["5", "6"],
      assignedSubjects: ["Quran", "Tajweed"],
    });

    console.log("✅ Created Muallim:", {
      id: createdMuallim.id,
      name: createdMuallim.name,
      phone: createdMuallim.phone,
      email: createdMuallim.email,
      designation: createdMuallim.designation,
      assignedClasses: createdMuallim.assignedClasses,
      isActive: createdMuallim.isActive,
    });

    if (!createdMuallim.id || createdMuallim.isActive !== true) {
      throw new Error("createMuallim failed: Invalid returned data");
    }

    // 2. Test Get All Muallims
    console.log("\n2️⃣ Testing getAllMuallims...");
    const allMuallims = await sadhrService.getAllMuallims();
    const found = allMuallims.some((m) => m.id === createdMuallim.id);
    console.log(`✅ Fetched ${allMuallims.length} total Muallims. New Muallim found in list: ${found}`);
    if (!found) {
      throw new Error("getAllMuallims failed: Newly created teacher not in active list");
    }

    // 3. Test Get Muallim By ID
    console.log("\n3️⃣ Testing getMuallimById...");
    const singleMuallim = await sadhrService.getMuallimById(createdMuallim.id);
    console.log("✅ Retrieved single Muallim:", singleMuallim.name);

    // 4. Test Update Muallim
    console.log("\n4️⃣ Testing updateMuallim...");
    const updatedMuallim = await sadhrService.updateMuallim(createdMuallim.id, {
      name: "Usthad Test Ibrahim Al-Bukhari",
      designation: "Senior Tajweed & Fiqh Instructor",
      assignedClasses: ["4", "5", "6"],
      assignedSubjects: ["Quran", "Tajweed", "Fiqh"],
    });

    console.log("✅ Updated Muallim:", {
      id: updatedMuallim.id,
      name: updatedMuallim.name,
      designation: updatedMuallim.designation,
      assignedClasses: updatedMuallim.assignedClasses,
    });

    if (
      updatedMuallim.name !== "Usthad Test Ibrahim Al-Bukhari" ||
      updatedMuallim.assignedClasses?.length !== 3
    ) {
      throw new Error("updateMuallim failed: Properties did not update correctly");
    }

    // 5. Test Soft Delete Muallim
    console.log("\n5️⃣ Testing deleteMuallim (Soft Delete + Archival)...");
    const deleteResult = await sadhrService.deleteMuallim(
      createdMuallim.id,
      "sadhr-principal-01",
      "Relocated to another district"
    );

    console.log("✅ Delete Result Message:", deleteResult.message);
    console.log("✅ Archival record saved in DeletedUser collection:", {
      originalUserId: deleteResult.archivedRecord.originalUserId,
      name: deleteResult.archivedRecord.name,
      reason: deleteResult.archivedRecord.reason,
      deletedAt: deleteResult.archivedRecord.deletedAt,
      deletedBy: deleteResult.archivedRecord.deletedBy,
    });

    // 6. Verify state in database
    const userInDb = await User.findById(createdMuallim.id);
    console.log("\n6️⃣ Database Verification:");
    console.log("Original User in DB isActive status:", userInDb?.isActive);
    console.log("Original User in DB deletedAt:", userInDb?.deletedAt);

    if (userInDb?.isActive !== false) {
      throw new Error("deleteMuallim failed: User.isActive was not set to false");
    }

    const archivedRecordInDb = await DeletedUser.findOne({ originalUserId: createdMuallim.id });
    if (!archivedRecordInDb) {
      throw new Error("deleteMuallim failed: DeletedUser archive record was not created");
    }
    console.log("Archived record confirmed in DeletedUser collection!");

    // Clean up test records
    await User.findByIdAndDelete(createdMuallim.id);
    await DeletedUser.findByIdAndDelete(archivedRecordInDb._id);
    console.log("🧹 Test records cleaned up successfully.");

    console.log("\n🎉 ALL MUALLIM CRUD TESTS PASSED SUCCESSFULLY! 🌟\n");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMuallimTests();
