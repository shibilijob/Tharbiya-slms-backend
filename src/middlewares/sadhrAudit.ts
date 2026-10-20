import type { NextFunction, Response } from "express";
import { Types } from "mongoose";
import type { AuthenticatedRequest } from "../modules/auth/auth.middleware.js";
import AuditLog from "../models/AuditLog.js";
import Class from "../models/Class.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import HifzTarget from "../models/HifzTarget.js";
import HifzRecord from "../models/HifzRecord.js";
import PracticalScore from "../models/PracticalScore.js";
import PracticalSubject from "../models/PracticalSubject.js";
import Subject from "../models/Subject.js";
import Achievement from "../models/Achievement.js";
import TimetablePeriod from "../models/TimetablePeriod.js";
import AcademicAssessment from "../models/AcademicAssessment.js";

const safeFields = new Set([
  "status", "date", "score", "marks", "month", "year", "subject", "subjectId",
  "category", "target", "surah", "ayah", "juz", "day", "period", "periodNumber", "examTerm", "maxMarks", "obtainedMarks", "grade",
  "isActive", "classId", "studentId", "achievementId",
]);

const safeSummary = (value: any): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    if (!safeFields.has(key) || field == null || typeof field === "object") continue;
    if (["string", "number", "boolean"].includes(typeof field)) result[key] = field;
  }
  return result;
};

const operationPath = (path: string) => /^\/api\/(attendance|hifz|practical|muallim)(\/|\?|$)/.test(path);

export const sadhrAudit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  if (req.user?.role !== "SADHR_MUALLIM" || !["POST", "PUT", "PATCH", "DELETE"].includes(method) || !operationPath(req.originalUrl)) return next();
  if (!req.user.id || !Types.ObjectId.isValid(req.user.id)) return res.status(401).json({ success: false, message: "Authenticated actor is invalid" });

  const pathParts = req.path.split("/").filter(Boolean);
  const entityType = (pathParts.find((part) => ["attendance", "targets", "records", "hifz", "practical", "practical-scores", "subjects", "achievements", "timetable", "periods", "marks", "assessments"].includes(part)) || pathParts[1] || "class-data").toUpperCase();
  const action = method === "POST" ? "CREATE" : method === "DELETE" ? "DELETE" : "UPDATE";
  const classPathIndex = pathParts.findIndex((part) => part === "class" || part === "classes");
  const studentPathIndex = pathParts.findIndex((part) => part === "student" || part === "students");
  let classId = String(req.body?.classId || req.params.classId || (classPathIndex >= 0 ? pathParts[classPathIndex + 1] : ""));
  const studentId = String(req.body?.studentId || req.params.studentId || (studentPathIndex >= 0 ? pathParts[studentPathIndex + 1] : ""));
  const lastPart = pathParts[pathParts.length - 1] || "";
  const recordId = String(req.params.id || req.params.recordId || req.body?.id || (Types.ObjectId.isValid(lastPart) ? lastPart : ""));
  let beforeSummary: Record<string, unknown> = {};
  if (Types.ObjectId.isValid(recordId)) {
    const recordModel = req.path.includes("/targets") ? HifzTarget
      : req.path.includes("/hifz/records") ? HifzRecord
      : req.path.includes("/attendance") ? Attendance
      : req.path.includes("/practical-scores") ? PracticalScore
      : req.path.includes("/practical-subjects") ? PracticalSubject
      : req.path.includes("/assessments") ? AcademicAssessment
      : req.path.includes("/subjects") ? Subject
      : req.path.includes("/achievements") ? Achievement
      : req.path.includes("/timetable") || req.path.includes("/periods") ? TimetablePeriod
      : null;
    if (recordModel) {
      const doc: any = await (recordModel as any).findById(recordId).lean();
      beforeSummary = safeSummary(doc);
      if (Types.ObjectId.isValid(String(doc?.classId || ""))) classId = String(doc.classId);
      if (!Types.ObjectId.isValid(String(doc?.classId || "")) && Types.ObjectId.isValid(String(doc?.studentId || ""))) {
        const owner = await Student.findById(doc.studentId).select("classId").lean();
        classId = String(owner?.classId || "");
      }
    }
  }
  if (!Types.ObjectId.isValid(classId) && Types.ObjectId.isValid(studentId)) {
    const student = await Student.findById(studentId).select("classId").lean();
    classId = String(student?.classId || "");
  } else if (Types.ObjectId.isValid(studentId)) {
    const student = await Student.findById(studentId).select("classId").lean();
    if (Types.ObjectId.isValid(String(student?.classId || ""))) classId = String(student?.classId);
  }
  if (!Types.ObjectId.isValid(classId)) {
    const className = String(req.body?.className || req.body?.class || req.body?.classId || "").trim();
    if (className) {
      const cls = await Class.findOne({ name: new RegExp(`^${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), isActive: true }).select("_id").lean();
      classId = String(cls?._id || "");
    }
  }

  const entityId = recordId || undefined;
  const log = await AuditLog.create({
    actorId: new Types.ObjectId(req.user.id), actorRole: "SADHR_MUALLIM",
    ...(Types.ObjectId.isValid(classId) ? { classId: new Types.ObjectId(classId) } : {}),
    entityType, entityId, action, outcome: "PENDING",
    requestId: String(req.headers["x-request-id"] || "").slice(0, 120) || undefined,
      changes: { ...(action === "CREATE" ? {} : { before: beforeSummary }), requested: safeSummary(req.body) },
  });

  const originalJson = res.json.bind(res);
  let finalized = false;
  res.json = ((body: any) => {
    if (finalized) return originalJson(body);
    finalized = true;
    const succeeded = res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false;
    void log.updateOne({ $set: {
      outcome: succeeded ? "SUCCESS" : "FAILED",
      ...(body?.data?._id || body?.data?.id ? { entityId: String(body.data._id || body.data.id) } : {}),
      ...(Types.ObjectId.isValid(String(body?.data?.classId || "")) ? { classId: body.data.classId } : {}),
      changes: { ...(action === "CREATE" ? {} : { before: beforeSummary }), requested: safeSummary(req.body), result: safeSummary(body?.data) },
    } }).then(() => originalJson(body)).catch((error) => {
      console.error("Sadhr audit finalization failed; pending audit entry retained:", error);
      res.status(503);
      return originalJson({ success: false, message: "Change outcome could not be recorded. Contact an administrator with the request ID.", requestId: log._id.toString() });
    });
    return res;
  }) as typeof res.json;

  next();
};
