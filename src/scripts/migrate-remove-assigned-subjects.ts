import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import DeletedUser from "../models/DeletedUser.js";

async function migrate() {
  console.log("===============================================================");
  console.log("🚀 MIGRATION: REMOVING assignedSubjects FROM ALL USER DOCUMENTS");
  console.log("===============================================================\n");

  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Could not access database instance");
    }
    console.log(`Connected to database: ${db.databaseName}\n`);

    // 1. Unset in Mongoose User collection
    const userResult = await User.updateMany(
      {},
      { $unset: { assignedSubjects: "" } }
    );
    console.log(`✅ [users] Matched: ${userResult.matchedCount}, Modified: ${userResult.modifiedCount}`);

    // 2. Unset in Mongoose DeletedUser collection
    const deletedUserResult = await DeletedUser.updateMany(
      {},
      { $unset: { assignedSubjects: "" } }
    );
    console.log(`✅ [deletedusers] Matched: ${deletedUserResult.matchedCount}, Modified: ${deletedUserResult.modifiedCount}`);

    // 3. Unset in Better Auth user collection if it exists
    const collections = await db.listCollections({ name: "user" }).toArray();
    if (collections.length > 0) {
      const authUserResult = await db.collection("user").updateMany(
        {},
        { $unset: { assignedSubjects: "" } }
      );
      console.log(`✅ [better-auth user] Matched: ${authUserResult.matchedCount}, Modified: ${authUserResult.modifiedCount}`);
    }

    // 4. Verification Check
    const remainingInUser = await User.countDocuments({ assignedSubjects: { $exists: true } });
    const remainingInDeleted = await DeletedUser.countDocuments({ assignedSubjects: { $exists: true } });
    let remainingInAuth = 0;
    if (collections.length > 0) {
      remainingInAuth = await db.collection("user").countDocuments({ assignedSubjects: { $exists: true } });
    }

    console.log("\n🔍 Verification Check (should all be 0):");
    console.log(`   Users with assignedSubjects: ${remainingInUser}`);
    console.log(`   DeletedUsers with assignedSubjects: ${remainingInDeleted}`);
    console.log(`   Better Auth users with assignedSubjects: ${remainingInAuth}`);

    if (remainingInUser === 0 && remainingInDeleted === 0 && remainingInAuth === 0) {
      console.log("\n🎉 MIGRATION SUCCESSFUL! assignedSubjects has been completely removed from all user records.");
    } else {
      throw new Error("Migration verification failed: Some documents still contain assignedSubjects");
    }

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }
}

migrate();
