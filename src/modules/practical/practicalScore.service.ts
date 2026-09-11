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
      const isAllowed = muallimService.isClassAssignedToTeacher(
        classObjectId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Access denied: You are not assigned to record practical scores for this class");
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
   * Bulk record scores for multiple students in a class for a practical subject & month
   */
  async recordBulkMonthlyScores(
    data: BulkRecordMonthlyScoreDTO,
    teacherId: string
  ): Promise<PracticalScoreResponseDTO[]> {
    const results: PracticalScoreResponseDTO[] = [];

    for (const item of data.scores) {
      const res = await this.recordMonthlyScore(
        {
          studentId: item.studentId,
          classId: data.classId,
          practicalSubjectId: data.practicalSubjectId,
          month: data.month,
          year: data.year,
          score: item.score,
          remarks: item.remarks,
          date: data.date,
        },
        teacherId
      );
      results.push(res);
    }

    return results;
  }

  /**
   * Get monthly practical scores scoped to class, subject, month, year
   */
  async getMonthlyScores(
    query: MonthlyScoreQueryDTO,
    teacherId: string
  ): Promise<PracticalScoreResponseDTO[]> {
    const filter: any = {};

    if (query.classId) {
      const classObjectId = await this.resolveClassObjectId(query.classId);

      // Verify teacher authorization
      if (teacherId) {
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
