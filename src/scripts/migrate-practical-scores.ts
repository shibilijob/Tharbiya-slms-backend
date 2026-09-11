import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

import PracticalScore from "../models/PracticalScore.js";
import PracticalSubject from "../models/PracticalSubject.js";

async function runMigration() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/tharbiya";
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(mongoUri);
  console.log("Connected successfully.\n");

  const evaluationsCollection = mongoose.connection.db!.collection("practicalevaluations");
  const evaluations = await evaluationsCollection.find().toArray();
  console.log(`Found ${evaluations.length} historical practical evaluations in MongoDB.`);

  let migratedCount = 0;
  let skippedCount = 0;
  const reviewNeeded: any[] = [];

  for (const ev of evaluations) {
    let year: number | null = null;
    let month: number | null = null;

    // 1. Try to extract month and year from ev.month ("YYYY-MM")
    if (ev.month && typeof ev.month === "string" && ev.month.includes("-")) {
      const parts = ev.month.split("-");
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        year = y;
        month = m;
      }
    }

    // 2. Fallback to ev.date
    if (!year || !month) {
      if (ev.date) {
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear();
          month = d.getMonth() + 1;
        }
      }
    }

    // 3. Fallback to ev.createdAt
    if (!year || !month) {
      if (ev.createdAt) {
        const d = new Date(ev.createdAt);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear();
          month = d.getMonth() + 1;
        }
      }
    }

    if (!year || !month) {
      console.warn(`⚠️ Could not reliably determine date for evaluation ${ev._id}`);
      reviewNeeded.push({ id: ev._id, reason: "No valid date or month found" });
      continue;
    }

    if (!Array.isArray(ev.scores) || ev.scores.length === 0) {
      continue;
    }

    for (const item of ev.scores) {
      let subjectId = item.practicalSubjectId;

      // If practicalSubjectId is missing, attempt to find matching subject by category name
      if (!subjectId) {
        const matchingSubject = await PracticalSubject.findOne({
          classId: ev.classId,
          name: { $regex: new RegExp(`^${item.category}$`, "i") },
          isActive: true,
        });

        if (matchingSubject) {
          subjectId = matchingSubject._id;
        }
      }

      if (!subjectId) {
        console.log(`ℹ️ Skipping score item without matching practical subject: category="${item.category}" for evaluation ${ev._id}`);
        skippedCount++;
        reviewNeeded.push({
          evaluationId: ev._id,
          studentId: ev.studentId,
          classId: ev.classId,
          category: item.category,
          score: item.score,
          reason: "No matching PracticalSubject in this class",
        });
        continue;
      }

      const subject = await PracticalSubject.findById(subjectId);
      const maxScore = subject?.maxScore || 5;

      await PracticalScore.findOneAndUpdate(
        {
          studentId: new mongoose.Types.ObjectId(ev.studentId),
          practicalSubjectId: new mongoose.Types.ObjectId(subjectId),
          month,
          year,
        },
        {
          classId: new mongoose.Types.ObjectId(ev.classId),
          score: Number(item.score) || 0,
          maxScore,
          remarks: item.remarks || "",
          evaluatedById: new mongoose.Types.ObjectId(ev.evaluatedById),
          date: ev.date ? new Date(ev.date) : new Date(year, month - 1, 1),
        },
        {
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      migratedCount++;
    }
  }

  console.log("\n==================================================");
  console.log("MIGRATION SUMMARY:");
  console.log(`- Successfully migrated scores: ${migratedCount}`);
  console.log(`- Skipped scores requiring review: ${skippedCount}`);
  if (reviewNeeded.length > 0) {
    console.log("- Review items (preserved without deletion):", JSON.stringify(reviewNeeded, null, 2));
  }
  console.log("- Original practicalevaluations collection remains completely intact.");
  console.log("==================================================\n");

  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
