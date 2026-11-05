import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

import { muallimService } from "./dist/modules/muallim/muallim.service.js";

async function testAuth() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const users = await db.collection("users").find({ role: { $in: ["MUALLIM", "SADHR_MUALLIM"] } }).toArray();
  const classes = await db.collection("classes").find({ isActive: true }).toArray();

  for (const u of users) {
    console.log(`\nUser: ${u.name} (${u.role}) - assignedClasses in DB: ${JSON.stringify(u.assignedClasses)}`);
    const context = await muallimService.getTeacherContext(u._id.toString());
    console.log(`Context assignedClassNames: ${JSON.stringify(context.assignedClassNames)}`);
    console.log(`Context assignedClassIds: ${JSON.stringify(context.assignedClassIds)}`);

    for (const c of classes) {
      const allowed = muallimService.isClassAssignedToTeacher(c._id, context.assignedClassIds, context.assignedClassNames);
      console.log(`  -> Class ${c.name} (${c._id}): ${allowed ? "ALLOWED" : "DENIED"}`);
    }
  }

  await mongoose.disconnect();
}

testAuth().catch(console.error);

