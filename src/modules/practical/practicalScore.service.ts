import mongoose from "mongoose";
import PracticalScore, { IPracticalScore } from "../../models/PracticalScore.js";
import PracticalSubject from "../../models/PracticalSubject.js";
import Student from "../../models/Student.js";
import Class from "../../models/Class.js";
import { muallimService } from "../muallim/muallim.service.js";
import type {
  RecordMonthlyScoreDTO,
  BulkRecordMonthlyScoreDTO,
  MonthlyScoreQueryDTO,
  PracticalScoreResponseDTO,
} from "./practical.types.js";

function formatScoreResponse(doc: any): PracticalScoreResponseDTO {
  const student = doc.studentId;
  const cls = doc.classId;
  const subject = doc.practicalSubjectId;
  const evaluatedBy = doc.evaluatedById;

  const maxScore = doc.maxScore || subject?.maxScore || 5;
  const percentage = maxScore > 0 ? Math.round((doc.score / maxScore) * 100) : 0;

  return {
    id: doc._id.toString(),
    studentId: student?._id ? student._id.toString() : student?.toString() || "",
    studentName: student?.name,
    admissionNumber: student?.admissionNumber,
    classId: cls?._id ? cls._id.toString() : cls?.toString() || "",
    className: cls?.name,
    practicalSubjectId: subject?._id ? subject._id.toString() : subject?.toString() || "",
    practicalSubjectName: subject?.name,
    month: doc.month,
    year: doc.year,
    score: doc.score,
    maxScore,
    percentage,
    remarks: doc.remarks || "",
    evaluatedById: evaluatedBy?._id ? evaluatedBy._id.toString() : evaluatedBy?.toString() || "",
    evaluatedByName: evaluatedBy?.name,
    date: doc.date ? new Date(doc.date).toISOString() : new Date().toISOString(),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export class PracticalScoreService {
  /**
   * Helper: Resolve class ObjectId from id or class name
   */
  private async resolveClassObjectId(classIdOrName: string): Promise<mongoose.Types.ObjectId> {
    if (mongoose.Types.ObjectId.isValid(classIdOrName)) {
      const cls = await Class.findById(classIdOrName);
      if (cls) return cls._id as mongoose.Types.ObjectId;
    }

    const clean = String(classIdOrName).replace(/^Class\s*/i, "").trim();
    const cls = await Class.findOne({
      name: { $regex: new RegExp(`^Class\\s*${clean}$|^${clean}$`, "i") },
      isActive: true,
    });

    if (!cls) {
      throw new Error(`Class "${classIdOrName}" not found`);
    }

    return cls._id as mongoose.Types.ObjectId;
  }

  /**
   * Record or update a single monthly practical score (Upsert)
   */
  async recordMonthlyScore(
    data: RecordMonthlyScoreDTO,
    teacherId: string
  ): Promise<PracticalScoreResponseDTO> {
    const classObjectId = await this.resolveClassObjectId(data.classId);

    // 1. Verify teacher assignment authorization
    if (teacherId) {
      const context = await muallimService.getTeacherContext(teacherId);
      const isSuperUser =
        (context.user?.role as string) === "SADHR_MUALLIM" ||
        (context.user?.role as string) === "ADMIN" ||
        (context.user?.role as string) === "SUPER_ADMIN";
      if (!isSuperUser) {
        const isAllowed = muallimService.isClassAssignedToTeacher(
          classObjectId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          throw new Error("Access denied: You are not assigned to record practical scores for this class");
        }
      }
    }

    // 2. Validate Month & Year
    const month = Number(data.month);
    const year = Number(data.year);
    if (!month || isNaN(month) || month < 1 || month > 12) {
      throw new Error("Invalid month: Month must be an integer between 1 and 12");
    }
    if (!year || isNaN(year) || year < 2000 || year > 2100) {
      throw new Error("Invalid year: Year must be a valid 4-digit number (e.g. 2026)");
    }

    // 3. Verify Practical Subject
    if (!mongoose.Types.ObjectId.isValid(data.practicalSubjectId)) {
      throw new Error("Invalid practical subject ID");
    }
    const practicalSubject = await PracticalSubject.findById(data.practicalSubjectId);
    if (!practicalSubject || !practicalSubject.isActive) {
      throw new Error("Practical subject not found or is inactive");
    }
    if (practicalSubject.classId.toString() !== classObjectId.toString()) {
      throw new Error("Practical subject does not belong to the specified class");
    }

    // 4. Verify Student
    if (!mongoose.Types.ObjectId.isValid(data.studentId)) {
      throw new Error("Invalid student ID");
    }
    const student = await Student.findById(data.studentId);
    if (!student || !student.isActive) {
      throw new Error("Student not found or is inactive");
    }
    if (student.classId.toString() !== classObjectId.toString()) {
      throw new Error("Student does not belong to the specified class");
    }

    // 5. Validate Score
    const scoreVal = Number(data.score);
    if (isNaN(scoreVal) || scoreVal < 0) {
      throw new Error("Score cannot be negative or invalid");
    }
    const maxScore = practicalSubject.maxScore || 5;
    if (scoreVal > maxScore) {
      throw new Error(`Score (${scoreVal}) cannot exceed practical subject maximum mark of ${maxScore}`);
    }

    const evaluationDate = data.date ? new Date(data.date) : new Date(year, month - 1, 1);

    // 6. Atomic Upsert: find by studentId + practicalSubjectId + month + year
    const updated = await PracticalScore.findOneAndUpdate(
      {
        studentId: student._id,
        practicalSubjectId: practicalSubject._id,
        month,
        year,
      },
      {
        classId: classObjectId,
        score: scoreVal,
        maxScore,
        remarks: data.remarks?.trim() || "",
        evaluatedById: teacherId ? new mongoose.Types.ObjectId(teacherId) : undefined,
        date: evaluationDate,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    )
      .populate("studentId", "name admissionNumber gender classId")
      .populate("classId", "name")
      .populate("practicalSubjectId", "name maxScore")
      .populate("evaluatedById", "name");

    return formatScoreResponse(updated);
  }

  /**
   * Bulk record scores for multiple students & practical subjects in a class for a month
   */
  async recordBulkMonthlyScores(
    data: BulkRecordMonthlyScoreDTO,
    teacherId: string
  ): Promise<PracticalScoreResponseDTO[]> {
    const classObjectId = await this.resolveClassObjectId(data.classId);

    // 1. Verify teacher assignment authorization
    if (teacherId) {
      const context = await muallimService.getTeacherContext(teacherId);
      const isSuperUser =
        (context.user?.role as string) === "SADHR_MUALLIM" ||
        (context.user?.role as string) === "ADMIN" ||
        (context.user?.role as string) === "SUPER_ADMIN";
      if (!isSuperUser) {
        const isAllowed = muallimService.isClassAssignedToTeacher(
          classObjectId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          throw new Error("Access denied: You are not assigned to record practical scores for this class");
        }
      }
    }

    // 2. Validate Month & Year
    const month = Number(data.month);
    const year = Number(data.year);
    if (!month || isNaN(month) || month < 1 || month > 12) {
      throw new Error("Invalid month: Month must be an integer between 1 and 12");
    }
    if (!year || isNaN(year) || year < 2000 || year > 2100) {
      throw new Error("Invalid year: Year must be a valid 4-digit number (e.g. 2026)");
    }

    // 3. Normalize entries (supports both multi-subject entries array and single-subject scores array)
    let rawEntries: Array<{ studentId: string; practicalSubjectId: string; score: number; remarks?: string }> = [];
    if (Array.isArray(data.entries)) {
      rawEntries = data.entries;
    } else if (data.practicalSubjectId && Array.isArray(data.scores)) {
      rawEntries = data.scores.map((s) => ({
        studentId: s.studentId,
        practicalSubjectId: data.practicalSubjectId!,
        score: s.score,
        remarks: s.remarks,
      }));
    }

    // Filter out entries with no mark provided (null, undefined, NaN, empty string)
    // Ensures empty marks are not accidentally saved as zero
    const validEntries = rawEntries.filter(
      (e) =>
        e &&
        e.studentId &&
        e.practicalSubjectId &&
        e.score !== undefined &&
        e.score !== null &&
        e.score !== ("" as any) &&
        !isNaN(Number(e.score))
    );

    if (validEntries.length === 0) {
      return [];
    }

    // Deduplicate entries by studentId + practicalSubjectId to prevent batch collisions
    const dedupedEntriesMap = new Map<string, typeof validEntries[0]>();
    for (const e of validEntries) {
      dedupedEntriesMap.set(`${e.studentId}_${e.practicalSubjectId}`, e);
    }
    const dedupedEntries = Array.from(dedupedEntriesMap.values());

    // 4. Fetch all active practical subjects for this class to validate assignment and max marks
    const classSubjects = await PracticalSubject.find({
      classId: classObjectId,
      isActive: true,
    });
    const subjectMap = new Map<string, any>(
      classSubjects.map((s) => [s._id.toString(), s])
    );

    // 5. Fetch all active students for this class to validate enrollment
    const classStudents = await Student.find({
      classId: classObjectId,
      isActive: true,
    });
    const studentMap = new Map<string, any>(
      classStudents.map((s) => [s._id.toString(), s])
    );

    // 6. Validate every entry before writing (Atomic safety: fail fast if any entry is invalid)
    for (const item of dedupedEntries) {
      const student = studentMap.get(item.studentId.toString());
      if (!student) {
        throw new Error(`Student ${item.studentId} does not belong to the selected class or is inactive`);
      }

      const subject = subjectMap.get(item.practicalSubjectId.toString());
      if (!subject) {
        throw new Error(`Practical subject ${item.practicalSubjectId} does not belong to the selected class or is inactive`);
      }

      const scoreVal = Number(item.score);
      if (isNaN(scoreVal) || scoreVal < 0) {
        throw new Error(`Invalid mark for student ${student.name} in ${subject.name}: Mark cannot be negative`);
      }

      const maxScore = subject.maxScore || 5;
      if (scoreVal > maxScore) {
        throw new Error(`Mark (${scoreVal}) for student ${student.name} exceeds maximum mark of ${maxScore} for ${subject.name}`);
      }
    }

    // 7. Atomic bulk upsert
    const evaluationDate = data.date ? new Date(data.date) : new Date(year, month - 1, 1);
    const evaluatorObjectId = (teacherId && mongoose.Types.ObjectId.isValid(teacherId))
      ? new mongoose.Types.ObjectId(teacherId)
      : undefined;

    const operations = dedupedEntries.map((item) => {
      const subject = subjectMap.get(item.practicalSubjectId.toString())!;
      const student = studentMap.get(item.studentId.toString())!;
      const scoreVal = Number(item.score);
      const maxScore = subject.maxScore || 5;

      return {
        updateOne: {
          filter: {
            studentId: student._id,
            practicalSubjectId: subject._id,
            month,
            year,
          },
          update: {
            $set: {
              classId: classObjectId,
              score: scoreVal,
              maxScore,
              remarks: item.remarks?.trim() || "",
              ...(evaluatorObjectId ? { evaluatedById: evaluatorObjectId } : {}),
              date: evaluationDate,
            },
            $setOnInsert: {
              createdAt: new Date(),
              ...(!evaluatorObjectId ? { evaluatedById: student.classId?.classTeacherId || classObjectId } : {}),
            },
          },
          upsert: true,
        },
      };
    });

    if (operations.length > 0) {
      await PracticalScore.bulkWrite(operations);
    }

    // 8. Return all saved docs populated
    const savedDocs = await PracticalScore.find({
      classId: classObjectId,
      month,
      year,
      practicalSubjectId: { $in: Array.from(subjectMap.keys()).map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .populate("studentId", "name admissionNumber gender classId")
      .populate("classId", "name")
      .populate("practicalSubjectId", "name maxScore")
      .populate("evaluatedById", "name")
      .sort({ "studentId.name": 1 });

    return savedDocs.map(formatScoreResponse);
  }

  /**
   * Get monthly practical scores scoped to class, subject, month, year
   */
  async getMonthlyScores(
    query: MonthlyScoreQueryDTO,
    teacherId: string
  ): Promise<PracticalScoreResponseDTO[]> {
    const filter: any = {};
    let isSuperUser = false;

    if (teacherId) {
      const context = await muallimService.getTeacherContext(teacherId);
      isSuperUser =
        (context.user?.role as string) === "SADHR_MUALLIM" ||
        (context.user?.role as string) === "ADMIN" ||
        (context.user?.role as string) === "SUPER_ADMIN";
      if (!isSuperUser) {
        if (context.assignedClassIds.length === 0) return [];
        filter.classId = { $in: context.assignedClassIds };
      }
    }

    if (query.classId) {
      const classObjectId = await this.resolveClassObjectId(query.classId);

      // Verify teacher authorization
      if (teacherId && !isSuperUser) {
        const context = await muallimService.getTeacherContext(teacherId);
        const isAllowed = muallimService.isClassAssignedToTeacher(
          classObjectId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          return [];
        }
      }

      filter.classId = classObjectId;
    }

    if (query.practicalSubjectId && mongoose.Types.ObjectId.isValid(query.practicalSubjectId)) {
      filter.practicalSubjectId = new mongoose.Types.ObjectId(query.practicalSubjectId);
    }

    if (query.studentId && mongoose.Types.ObjectId.isValid(query.studentId)) {
      filter.studentId = new mongoose.Types.ObjectId(query.studentId);
    }

    if (query.month !== undefined && query.month !== "") {
      const m = Number(query.month);
      if (!isNaN(m) && m >= 1 && m <= 12) {
        filter.month = m;
      }
    }

    if (query.year !== undefined && query.year !== "") {
      const y = Number(query.year);
      if (!isNaN(y) && y >= 2000) {
        filter.year = y;
      }
    }

    const docs = await PracticalScore.find(filter)
      .populate("studentId", "name admissionNumber gender classId")
      .populate("classId", "name")
      .populate("practicalSubjectId", "name maxScore")
      .populate("evaluatedById", "name")
      .sort({ year: -1, month: -1, createdAt: -1 });

    return docs.map(formatScoreResponse);
  }

  /**
   * Get student's monthly history across all months
   */
  async getStudentMonthlyHistory(
    studentId: string,
    teacherId?: string
  ): Promise<PracticalScoreResponseDTO[]> {
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error("Invalid student ID");
    }

    if (teacherId) await muallimService.assertStudentAssigned(teacherId, studentId);

    const docs = await PracticalScore.find({
      studentId: new mongoose.Types.ObjectId(studentId),
    })
      .populate("studentId", "name admissionNumber gender classId")
      .populate("classId", "name")
      .populate("practicalSubjectId", "name maxScore")
      .populate("evaluatedById", "name")
      .sort({ year: -1, month: -1, date: -1 });

    return docs.map(formatScoreResponse);
  }

  /**
   * Delete a monthly score record
   */
  async deleteMonthlyScore(scoreId: string, teacherId: string): Promise<{ message: string }> {
    if (!mongoose.Types.ObjectId.isValid(scoreId)) {
      throw new Error("Invalid score ID");
    }

    const score = await PracticalScore.findById(scoreId);
    if (!score) {
      throw new Error("Practical score record not found");
    }

    if (teacherId) {
      const context = await muallimService.getTeacherContext(teacherId);
      const isAllowed = muallimService.isClassAssignedToTeacher(
        score.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Access denied: You are not authorized to delete scores for this class");
      }
    }

    await PracticalScore.findByIdAndDelete(scoreId);
    return { message: "Practical score deleted successfully" };
  }
}

export const practicalScoreService = new PracticalScoreService();
