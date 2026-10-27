import mongoose from "mongoose";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import Assessment from "../../models/AcademicAssessment.js";
import Student from "../../models/Student.js";
import Class from "../../models/Class.js";
import { muallimService } from "./muallim.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { calculateGradeFromMarks } from "../../utils/gradeCalculator.js";

const AssessmentModel = Assessment as mongoose.Model<any>;

const resolveClass = async (value: string) => {
  const cleanName = value.replace(/^Class\s*/i, "").trim();
  const cls = mongoose.Types.ObjectId.isValid(value)
    ? await Class.findById(value)
    : await Class.findOne({ name: { $in: [value, `Class ${cleanName}`] }, isActive: true });
  if (!cls) throw Object.assign(new Error("Class not found"), { statusCode: 404 });
  return cls;
};


const FALLBACK_SUBJECTS = [
  { id: "Quran", name: "Quran Tilawat", code: "QUR", malayalamTitle: "ഖുർആൻ പാരായണം", arabicTitle: "تلاوة القرآن" },
  { id: "Hifz", name: "Hifzul Quran", code: "HIF", malayalamTitle: "ഹിഫ്ള്", arabicTitle: "حفظ القرآن" },
  { id: "Tajweed", name: "Tajweed Rules", code: "TAJ", malayalamTitle: "തജ്‌വീദ്", arabicTitle: "التجويد" },
  { id: "Arabic", name: "Arabic Language", code: "ARB", malayalamTitle: "അറബി ഭാഷ", arabicTitle: "اللغة العربية" },
  { id: "Islamic Studies", name: "Islamic Studies & Thareekh", code: "ISL", malayalamTitle: "ഇസ്‌ലാമിക് സ്റ്റഡീസ് & താരീഖ്", arabicTitle: "التاريخ الإسلامي" },
  { id: "Fiqh", name: "Fiqh & Ahkam", code: "FIQ", malayalamTitle: "ഫിഖ്ഹ് (കർമ്മശാസ്ത്രം)", arabicTitle: "الفقه الإسلامي" },
  { id: "Akhlaq", name: "Akhlaq & Adab", code: "AKH", malayalamTitle: "അഖ്‌ലാഖ് & ആദാബ്", arabicTitle: "الأخلاق والآداب" },
];

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

  /**
   * GET /api/assessment/student-marks?classId=:classId&assessmentId=:assessmentId&studentId=:studentId
   * Returns all subjects for the class and any existing mark records already entered for this student
   */
  getStudentMarks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actorId = req.user!.id;
    const classId = String(req.query.classId || "");
    const assessmentId = String(req.query.assessmentId || "");
    const studentId = String(req.query.studentId || "");

    if (!classId || !assessmentId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "classId, assessmentId, and studentId query parameters are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const cls = await resolveClass(classId);
    await muallimService.assertClassAssigned(actorId, cls.id);

    const student = await Student.findOne({ _id: studentId, classId: cls._id, isActive: true });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found in this class" });
    }

    // 1. Fetch subjects assigned to this class
    const dbSubjects = await muallimService.getSubjects(cls.id, actorId);
    let finalSubjects: any[] = [];

    if (dbSubjects && dbSubjects.length > 0) {
      finalSubjects = dbSubjects.map((s: any) => ({
        id: s.id || s._id,
        name: s.name,
        code: s.code || s.name.substring(0, 3).toUpperCase(),
        arabicTitle: s.arabicTitle || s.arabicName || s.name,
        malayalamTitle: s.malayalamTitle || s.malayalamName || s.name,
        color: s.color || "#0F6B50",
        icon: s.icon || "BookOpen",
      }));
    } else {
      finalSubjects = FALLBACK_SUBJECTS.map((s) => ({ ...s }));
    }

    // 2. Fetch existing marks for this student and assessment
    const existing = await AssessmentModel.find({
      studentId: student._id,
      $or: [
        { assessmentId: String(assessmentId) },
        { examTerm: String(assessmentId) },
      ],
    }).lean();

    const formattedMarks = existing.map((r: any) => ({
      id: String(r._id),
      subjectId: r.subjectId ? String(r.subjectId) : r.subject,
      subject: r.subject,
      marksObtained: r.obtainedMarks,
      maxMarks: r.maxMarks,
      grade: r.grade,
      isAbsent: Boolean(r.isAbsent),
      remarks: r.remarks || "",
    }));

    return res.json({
      success: true,
      data: {
        classId: cls.id,
        className: cls.name,
        assessmentId: String(assessmentId),
        student: {
          id: student._id.toString(),
          name: student.name,
          admissionNo: student.admissionNumber || "",
          class: cls.name,
        },
        subjects: finalSubjects,
        marks: formattedMarks,
      },
      subjects: finalSubjects,
      marks: formattedMarks,
    });
  });

  /**
   * POST /api/assessment/student-marks/save
   * Batch upsert all marks for a single student in an assessment using bulkWrite
   */
  saveStudentMarks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actorId = req.user!.id;
    const { classId, assessmentId, studentId, marks } = req.body || {};

    if (!classId || !assessmentId || !studentId || !Array.isArray(marks)) {
      return res.status(400).json({
        success: false,
        message: "classId, assessmentId, studentId, and marks array are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const cls = await resolveClass(classId);
    await muallimService.assertClassAssigned(actorId, cls.id);

    const student = await Student.findOne({ _id: studentId, classId: cls._id, isActive: true });
    if (!student) {
      return res.status(403).json({ success: false, message: "Student does not belong to the selected class" });
    }

    // Lookup subjects to ensure subjectName is captured
    const dbSubjects = await muallimService.getSubjects(cls.id, actorId);
    const subjectMap: Record<string, any> = {};
    (dbSubjects || []).forEach((s: any) => {
      subjectMap[String(s.id)] = s;
      subjectMap[s.name.toLowerCase()] = s;
    });
    FALLBACK_SUBJECTS.forEach((s) => {
      if (!subjectMap[s.id]) subjectMap[s.id] = s;
      if (!subjectMap[s.name.toLowerCase()]) subjectMap[s.name.toLowerCase()] = s;
    });

    const operations = marks.map((m: any) => {
      const isAbsent = Boolean(m.isAbsent);
      const maxMarks = Math.max(1, Number(m.maxMarks) || 100);
      const marksObtained = isAbsent ? 0 : Math.min(maxMarks, Math.max(0, Number(m.marksObtained) || 0));
      const grade = isAbsent ? "ABSENT" : calculateGradeFromMarks(marksObtained, maxMarks).grade;

      const sIdStr = String(m.subjectId || "").trim();
      const resolved = subjectMap[sIdStr] || subjectMap[sIdStr.toLowerCase()];
      const subjectName = resolved ? resolved.name : (m.subjectName || sIdStr);

      return {
        updateOne: {
          filter: {
            studentId: student._id,
            assessmentId: String(assessmentId),
            subjectId: sIdStr,
          },
          update: {
            $set: {
              classId: cls._id,
              studentId: student._id,
              assessmentId: String(assessmentId),
              examTerm: String(assessmentId),
              subjectId: sIdStr,
              subject: subjectName,
              date: new Date(),
              maxMarks,
              obtainedMarks: marksObtained,
              grade,
              isAbsent,
              remarks: m.remarks ? String(m.remarks).trim() : "",
              teacherId: new mongoose.Types.ObjectId(actorId),
            },
          },
          upsert: true,
        },
      };
    });

    if (operations.length > 0) {
      await AssessmentModel.bulkWrite(operations);
    }

    const savedRecords = await AssessmentModel.find({
      studentId: student._id,
      assessmentId: String(assessmentId),
    }).lean();

    return res.status(200).json({
      success: true,
      message: `Marks saved successfully for ${student.name}`,
      data: {
        studentId: student._id.toString(),
        assessmentId: String(assessmentId),
        classId: cls.id,
        savedCount: operations.length,
        records: savedRecords.map((r: any) => ({
          id: String(r._id),
          subjectId: r.subjectId,
          subject: r.subject,
          obtainedMarks: r.obtainedMarks,
          maxMarks: r.maxMarks,
          grade: r.grade,
          isAbsent: Boolean(r.isAbsent),
          remarks: r.remarks || "",
        })),
      },
    });
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
