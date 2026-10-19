import mongoose from "mongoose";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import Assessment from "../../models/AcademicAssessment.js";
import Student from "../../models/Student.js";
import Class from "../../models/Class.js";
import { muallimService } from "./muallim.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const AssessmentModel = Assessment as mongoose.Model<any>;

const resolveClass = async (value: string) => {
  const cleanName = value.replace(/^Class\s*/i, "").trim();
  const cls = mongoose.Types.ObjectId.isValid(value)
    ? await Class.findById(value)
    : await Class.findOne({ name: { $in: [value, `Class ${cleanName}`] }, isActive: true });
  if (!cls) throw Object.assign(new Error("Class not found"), { statusCode: 404 });
  return cls;
};

export class AssessmentController {
  list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actorId = req.user!.id;
    const classId = String(req.query.classId || "");
    if (req.user?.role === "SADHR_MUALLIM" && !classId) return res.status(400).json({ success: false, message: "classId is required" });
    const filter: Record<string, any> = {};
    if (req.user?.role === "PARENT") {
      const children = await Student.find({ parentId: actorId, isActive: true }).select("_id").lean();
      filter.studentId = { $in: children.map((child) => child._id) };
    } else if (classId) {
      const cls = await resolveClass(classId);
      await muallimService.assertClassAssigned(actorId, cls.id);
      filter.classId = cls._id;
    } else {
      const context = await muallimService.getTeacherContext(actorId);
      filter.classId = { $in: context.assignedClassIds };
    }
    const rows = await AssessmentModel.find(filter).sort({ date: -1 }).lean();
    return res.json({ success: true, data: rows.map((r: any) => ({ ...r, id: String(r._id), studentId: String(r.studentId), teacherId: String(r.teacherId), classId: String(r.classId), date: new Date(r.date).toISOString().slice(0, 10) })) });
  });

  save = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actorId = req.user!.id;
    const { studentId, subject, examTerm, date, maxMarks, obtainedMarks, grade, remarks } = req.body || {};
    const classId = String(req.body?.classId || "");
    if (!classId || !mongoose.Types.ObjectId.isValid(studentId) || !subject || !examTerm || !date || !grade || !Number.isFinite(Number(maxMarks)) || !Number.isFinite(Number(obtainedMarks)) || Number(maxMarks) <= 0 || Number(obtainedMarks) < 0 || Number(obtainedMarks) > Number(maxMarks)) {
      return res.status(400).json({ success: false, message: "Valid class, student, subject, term, date, and marks are required" });
    }
    const cls = await resolveClass(classId);
    await muallimService.assertClassAssigned(actorId, cls.id);
    const student = await Student.findOne({ _id: studentId, classId: cls._id, isActive: true });
    if (!student) return res.status(403).json({ success: false, message: "Student does not belong to the selected class" });
    const saved = await AssessmentModel.findOneAndUpdate(
      { studentId, subject: String(subject), examTerm: String(examTerm) },
      { $set: { classId: cls._id, studentId, subject: String(subject), examTerm: String(examTerm), date: new Date(date), maxMarks: Number(maxMarks), obtainedMarks: Number(obtainedMarks), grade, remarks: String(remarks || ""), teacherId: actorId } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    return res.status(200).json({ success: true, data: { ...saved, id: String(saved?._id), studentId: String(saved?.studentId), classId: cls.id, teacherId: actorId, date: new Date(saved!.date).toISOString().slice(0, 10) } });
  });

  remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid assessment ID" });
    const record = await AssessmentModel.findById(id);
    if (!record) return res.status(404).json({ success: false, message: "Assessment not found" });
    await muallimService.assertClassAssigned(req.user!.id, String(record.classId));
    await record.deleteOne();
    return res.json({ success: true, data: { id } });
  });
}

export const assessmentController = new AssessmentController();
