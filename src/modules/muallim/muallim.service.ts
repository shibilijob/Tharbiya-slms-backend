import mongoose from "mongoose";
import Attendance from "../../models/Attendance.js";
import HifzRecord from "../../models/HifzRecord.js";
import HifzTarget from "../../models/HifzTarget.js";
import PracticalEvaluation from "../practical/practical.model.js";
import PracticalSubject from "../../models/PracticalSubject.js";
import Subject from "../../models/Subject.js";
import Achievement from "../../models/Achievement.js";
import TimetablePeriod from "../../models/TimetablePeriod.js";
import Student from "../../models/Student.js";
import Class from "../../models/Class.js";
import User from "../../models/User.js";
import type {
  AttendanceStatus,
  MarkClassAttendanceDTO,
  StudentAttendanceSummary,
  StudentHifzSummary,
  RecordPracticalEvaluationDTO,
  StudentPracticalReport,
  MuallimDashboardStats,
  CreatePracticalSubjectDTO,
  UpdatePracticalSubjectDTO,
  PracticalSubjectResponseDTO,
  CreateSubjectDTO,
  UpdateSubjectDTO,
  SubjectResponseDTO,
  CreateAchievementDTO,
  AchievementResponseDTO,
  CreatePeriodDTO,
  UpdatePeriodDTO,
  PeriodResponseDTO,
  MadrasaDay,
} from "./muallim.types.js";

const formatPracticalSubjectResponse = (subj: any): PracticalSubjectResponseDTO => ({
  id: subj._id.toString(),
  name: subj.name,
  classId: subj.classId?._id ? subj.classId._id.toString() : subj.classId?.toString() || "",
  className: subj.classId?.name || undefined,
  maxScore: subj.maxScore ?? 5,
  isActive: subj.isActive,
  createdAt: subj.createdAt,
  updatedAt: subj.updatedAt,
});

const formatSubjectResponse = (subj: any): SubjectResponseDTO => ({
  id: subj._id.toString(),
  name: subj.name,
  arabicTitle: subj.arabicTitle || subj.name,
  malayalamTitle: subj.malayalamTitle || subj.nameMalayalam || subj.malayalamName || subj.name,
  classId: subj.classId?._id ? subj.classId._id.toString() : subj.classId?.toString() || undefined,
  className: subj.classId?.name || undefined,
  description: subj.description || "",
  color: subj.color || "#0F6B50",
  icon: subj.icon || "BookOpen",
  isActive: subj.isActive,
  createdAt: subj.createdAt,
  updatedAt: subj.updatedAt,
});

const formatAchievementResponse = (ach: any): AchievementResponseDTO => ({
  id: ach._id.toString(),
  studentId: ach.studentId?._id ? ach.studentId._id.toString() : ach.studentId?.toString() || "",
  studentName: ach.studentId?.name || undefined,
  classId: ach.classId?._id ? ach.classId._id.toString() : ach.classId?.toString() || undefined,
  className: ach.classId?.name || undefined,
  title: ach.title,
  titleMalayalam: ach.titleMalayalam || undefined,
  category: ach.category,
  description: ach.description,
  badgeIcon: ach.badgeIcon || "🏆",
  date: ach.date,
  awardedById: ach.awardedById?._id ? ach.awardedById._id.toString() : ach.awardedById?.toString() || "",
  awardedByName: ach.awardedById?.name || undefined,
  isActive: ach.isActive,
  createdAt: ach.createdAt,
  updatedAt: ach.updatedAt,
});

const formatPeriodResponse = (p: any): PeriodResponseDTO => ({
  id: p._id.toString(),
  classId: p.classId?._id ? p.classId._id.toString() : p.classId?.toString() || "",
  className: p.classId?.name || undefined,
  day: p.day,
  periodNumber: p.periodNumber,
  startTime: p.startTime,
  endTime: p.endTime,
  subject: p.subject,
  subjectMalayalam: p.subjectMalayalam || undefined,
  teacherName: p.teacherName || undefined,
  teacherId: p.teacherId?._id ? p.teacherId._id.toString() : p.teacherId?.toString() || undefined,
  room: p.room || undefined,
  notes: p.notes || undefined,
  isActive: p.isActive,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

const normalizeAttendanceStatusForDisplay = (status: string): AttendanceStatus => {
  if (status === "EXCUSED") return "LEAVE";
  if (status === "UNEXCUSED") return "ABSENT";
  if (status === "LATE") return "PRESENT";
  if (status === "ABSENT" || status === "LEAVE" || status === "HOLIDAY") return status;
  return "PRESENT";
};

const normalizeAttendanceRecords = (records: any[]) =>
  records.map((record: any) => {
    const plain = typeof record.toObject === "function" ? record.toObject() : record;
    return {
      ...plain,
      status: normalizeAttendanceStatusForDisplay(plain.status),
    };
  });

export class MuallimService {
  /**
   * =========================================================================
   * ATTENDANCE MANAGEMENT FUNCTIONS
   * =========================================================================
   */

  /**
   * Helper: Resolve classId to ObjectId (supports "4", "Class 4", or valid ObjectId)
   */
  async resolveClassObjectId(classId: string): Promise<mongoose.Types.ObjectId> {
    if (!classId) {
      throw new Error("Class ID is required");
    }
    const str = String(classId).trim();
    if (mongoose.Types.ObjectId.isValid(str)) {
      const cls = await Class.findById(str);
      if (cls) return cls._id as mongoose.Types.ObjectId;
    }

    const cleanNum = str.replace(/^Class\s*/i, "").trim();
    let cls = await Class.findOne({
      name: { $regex: new RegExp(`^Class\\s*${cleanNum}$|^${cleanNum}$`, "i") },
      isActive: true,
    });
    if (!cls) {
      cls = await Class.findOne({
        name: { $regex: new RegExp(`^Class\\s*${cleanNum}$|^${cleanNum}$`, "i") },
      });
    }

    if (cls) return cls._id as mongoose.Types.ObjectId;
    throw new Error(`Class "${classId}" not found`);
  }

  /**
   * Bulk mark / upsert daily attendance for a class
   */
  async markClassAttendance(data: MarkClassAttendanceDTO, markedById: string) {
    const classObjectId = await this.resolveClassObjectId(data.classId);

    // Verify teacher authorization if markedById is a teacher
    if (markedById && mongoose.Types.ObjectId.isValid(markedById)) {
      const teacher = await User.findById(markedById);
      if (teacher && teacher.role === "MUALLIM") {
        const context = await this.getTeacherContext(markedById);
        const isAllowed = this.isClassAssignedToTeacher(
          classObjectId.toString(),
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          throw new Error("Unauthorized: You can only record attendance for your assigned classes");
        }
      }
    }

    const cleanDateStr =
      typeof data.date === "string"
        ? data.date.split("T")[0]
        : new Date(data.date).toISOString().split("T")[0];
    const [y, m, d] = cleanDateStr.split("-").map(Number);
    const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

    if (!mongoose.Types.ObjectId.isValid(markedById)) {
      throw new Error("A valid Muallim ID is required to mark attendance");
    }
    const markedByObjectId = new mongoose.Types.ObjectId(markedById);

    const operations = data.records.map((record) => {
      return {
        updateOne: {
          filter: {
            studentId: new mongoose.Types.ObjectId(record.studentId),
            date: targetDate,
          },
          update: {
            $set: {
              classId: classObjectId,
              status: record.status,
              remark: record.remark || "",
              markedById: markedByObjectId,
              date: targetDate,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Attendance.bulkWrite(operations);

    // Fetch and return the server-persisted records from MongoDB
    const savedRecords = await Attendance.find({
      studentId: { $in: data.records.map((r) => new mongoose.Types.ObjectId(r.studentId)) },
      date: targetDate,
    })
      .populate("studentId", "name admissionNumber gender classId")
      .populate("markedById", "name email");

    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
      records: normalizeAttendanceRecords(savedRecords),
    };
  }

  /**
   * Get class attendance for a specific date
   */
  async getClassAttendanceByDate(classId: string, dateStr: string) {
    const classObjectId = await this.resolveClassObjectId(classId);
    const cleanDateStr =
      typeof dateStr === "string"
        ? dateStr.split("T")[0]
        : new Date(dateStr).toISOString().split("T")[0];
    const [y, m, d] = cleanDateStr.split("-").map(Number);
    const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

    const records = await Attendance.find({
      classId: classObjectId,
      date: targetDate,
    })
      .populate("studentId", "name admissionNumber gender classId")
      .populate("markedById", "name email");

    return normalizeAttendanceRecords(records);
  }

  /**
   * Get attendance records filtered by query parameters and user context
   */
  async getAttendanceList(filters: {
    classId?: string;
    date?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
    beforeDate?: Date;
    userId?: string;
    role?: string;
  }) {
    const query: any = {};

    if (filters.studentId && mongoose.Types.ObjectId.isValid(filters.studentId)) {
      query.studentId = new mongoose.Types.ObjectId(filters.studentId);
    }

    if (filters.classId) {
      try {
        const classObjectId = await this.resolveClassObjectId(filters.classId);
        query.classId = classObjectId;
      } catch {
        return [];
      }
    } else if (filters.role === "MUALLIM" && filters.userId) {
      const context = await this.getTeacherContext(filters.userId);
      if (context.assignedClassIds.length > 0) {
        query.classId = { $in: context.assignedClassIds };
      }
    } else if (filters.role === "PARENT" && filters.userId && mongoose.Types.ObjectId.isValid(filters.userId)) {
      const parentStudents = await Student.find({ parentId: new mongoose.Types.ObjectId(filters.userId) }).select("_id");
      const studentObjectIds = parentStudents.map((s) => s._id as mongoose.Types.ObjectId);
      query.studentId = { $in: studentObjectIds };
    }

    if (filters.date) {
      const cleanDateStr = filters.date.split("T")[0];
      const [y, m, d] = cleanDateStr.split("-").map(Number);
      const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      query.date = targetDate;
    } else if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        const [sy, sm, sd] = filters.startDate.split("T")[0].split("-").map(Number);
        query.date.$gte = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
      }
      if (filters.endDate) {
        const [ey, em, ed] = filters.endDate.split("T")[0].split("-").map(Number);
        query.date.$lte = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));
      }
    }

    if (filters.beforeDate) {
      if (!query.date || query.date instanceof Date) {
        query.date = query.date ? { $eq: query.date } : {};
      }
      query.date.$lt = filters.beforeDate;
    }

    const records = await Attendance.find(query)
      .populate("studentId", "name admissionNumber gender classId")
      .populate("markedById", "name email")
      .sort({ date: -1 });

    return normalizeAttendanceRecords(records);
  }

  /**
   * Get attendance history and statistics for a student
   */
  async getStudentAttendance(
    studentId: string,
    startDate?: string,
    endDate?: string,
    beforeDate?: Date
  ): Promise<{ records: any[]; summary: StudentAttendanceSummary }> {
    const query: any = { studentId: new mongoose.Types.ObjectId(studentId) };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (beforeDate) {
      if (!query.date) query.date = {};
      query.date.$lt = beforeDate;
    }

    const records = normalizeAttendanceRecords(await Attendance.find(query).sort({ date: -1 }));

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === "PRESENT").length;
    const absentDays = records.filter((r) => r.status === "ABSENT").length;
    const leaveDays = records.filter((r) => r.status === "LEAVE").length;
    const holidayDays = records.filter((r) => r.status === "HOLIDAY").length;
    const countedDays = presentDays + absentDays + leaveDays;
    const percentage = countedDays > 0 ? Math.round((presentDays / countedDays) * 100) : 100;

    return {
      records,
      summary: {
        studentId,
        totalDays,
        presentDays,
        absentDays,
        leaveDays,
        holidayDays,
        percentage,
      },
    };
  }

  /**
   * =========================================================================
   * HIFZ & QURAN RECITATION FUNCTIONS
   * =========================================================================
   */

  /**
   * Get student's recent Quran recitation and Hifz history
   */
  async getStudentHifzHistory(studentId: string, limit = 20) {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    return HifzRecord.find({ studentId: studentObjectId })
      .populate("hifzTargetId")
      .populate("recordedBy", "name")
      .sort({ date: -1 })
      .limit(limit);
  }

  /**
   * Get student's overall Hifz statistics and summary
   */
  async getStudentHifzSummary(studentId: string): Promise<StudentHifzSummary> {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    const records = await HifzRecord.find({ studentId: studentObjectId })
      .populate("hifzTargetId")
      .sort({ date: -1 });

    const completedTargetsCount = records.filter((r) => r.status === "COMPLETED").length;

    let currentSurah = "Al-Fatihah";
    let currentAyah = 1;

    if (records.length > 0 && records[0].hifzTargetId) {
      const target: any = records[0].hifzTargetId;
      currentSurah = target.surahName || target.criteria || "Al-Mulk";
      currentAyah = target.toAyah || 1;
    }

    const uniqueSurahs = new Set<string>();
    records.forEach((r) => {
      const target: any = r.hifzTargetId;
      if (target?.surahName) uniqueSurahs.add(target.surahName);
      else if (target?.criteria) uniqueSurahs.add(target.criteria);
    });

    const averageRating = 5.0;

    return {
      studentId,
      totalMemorizedSurahs: uniqueSurahs.size || completedTargetsCount,
      completedTargetsCount,
      currentSurah,
      currentAyah,
      averageRating,
      recentLogs: records.slice(0, 5),
    };
  }

  /**
   * =========================================================================
   * PRACTICAL & ADAB EVALUATION FUNCTIONS
   * =========================================================================
   */

  /**
   * Record a new practical and adab evaluation for a student
   */
  async recordEvaluation(data: RecordPracticalEvaluationDTO, evaluatedById: string) {
    let targetClassId = data.classId;
    if (!mongoose.Types.ObjectId.isValid(data.classId)) {
      const cleanClsName = String(data.classId).replace(/^Class\s*/i, "").trim();
      const cls = await Class.findOne({
        name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
        isActive: true,
      });
      if (cls) {
        targetClassId = cls._id.toString();
      }
    }

    if (evaluatedById) {
      const context = await this.getTeacherContext(evaluatedById);
      const isAllowed = this.isClassAssignedToTeacher(
        targetClassId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: You can only record evaluations for your assigned classes");
      }
    }

    // Validate subject-specific maximum score against PracticalSubject
    const activeSubjects = await PracticalSubject.find({
      classId: new mongoose.Types.ObjectId(targetClassId),
      isActive: true,
    });

    for (const item of data.scores) {
      if (typeof item.score !== "number" || isNaN(item.score) || item.score < 0) {
        throw new Error(`Score for "${item.category}" cannot be negative or invalid`);
      }

      let matchingSubject: any = null;
      if (item.practicalSubjectId && mongoose.Types.ObjectId.isValid(item.practicalSubjectId)) {
        matchingSubject = activeSubjects.find(
          (s) => s._id.toString() === item.practicalSubjectId!.toString()
        );
      }
      if (!matchingSubject) {
        matchingSubject = activeSubjects.find(
          (s) => s.name.trim().toLowerCase() === item.category.trim().toLowerCase()
        );
      }

      if (matchingSubject) {
        const allowedMax = matchingSubject.maxScore ?? 5;
        if (item.score > allowedMax) {
          throw new Error(
            `Score for "${item.category}" cannot exceed maximum mark of ${allowedMax}`
          );
        }
      }
    }

    const totalScore = data.scores.reduce((sum, item) => sum + item.score, 0);
    const overallScore =
      data.scores.length > 0 ? Number((totalScore / data.scores.length).toFixed(1)) : 0;

    const evaluation = await PracticalEvaluation.create({
      studentId: new mongoose.Types.ObjectId(data.studentId),
      classId: new mongoose.Types.ObjectId(targetClassId),
      term: data.term || "Monthly Evaluation",
      month: data.month || new Date().toISOString().slice(0, 7),
      scores: data.scores.map((item) => ({
        practicalSubjectId: item.practicalSubjectId && mongoose.Types.ObjectId.isValid(item.practicalSubjectId)
          ? new mongoose.Types.ObjectId(item.practicalSubjectId)
          : undefined,
        category: item.category,
        score: item.score,
        remarks: item.remarks || "",
      })),
      overallScore,
      overallRemarks: data.overallRemarks || "",
      evaluatedById: new mongoose.Types.ObjectId(evaluatedById),
      date: data.date ? new Date(data.date) : new Date(),
    });

    return evaluation;
  }

  /**
   * Get practical evaluation history for a student
   */
  async getStudentEvaluations(studentId: string) {
    return PracticalEvaluation.find({
      studentId: new mongoose.Types.ObjectId(studentId),
    })
      .sort({ date: -1 })
      .populate("evaluatedById", "name");
  }

  /**
   * Get comprehensive practical report for a student
   */
  async getStudentPracticalReport(studentId: string): Promise<StudentPracticalReport> {
    const evaluations = await PracticalEvaluation.find({
      studentId: new mongoose.Types.ObjectId(studentId),
    }).sort({ date: -1 });

    const totalEvaluations = evaluations.length;
    const categoryTotals: Record<string, { sum: number; count: number }> = {};

    let totalScoreSum = 0;
    for (const ev of evaluations) {
      totalScoreSum += ev.overallScore;
      for (const item of ev.scores) {
        const current = categoryTotals[item.category] || { sum: 0, count: 0 };
        current.sum += item.score;
        current.count += 1;
        categoryTotals[item.category] = current;
      }
    }

    const categoryBreakdown: Record<string, number> = {};
    for (const [cat, val] of Object.entries(categoryTotals)) {
      categoryBreakdown[cat] = Number((val.sum / val.count).toFixed(1));
    }

    const averageScore =
      totalEvaluations > 0 ? Number((totalScoreSum / totalEvaluations).toFixed(1)) : 0;

    return {
      studentId,
      averageScore,
      totalEvaluations,
      categoryBreakdown,
      recentEvaluations: evaluations.slice(0, 5),
    };
  }

  /**
   * =========================================================================
  /**
   * Helper: Retrieve assigned classes and subjects context for a specific teacher/muallim
   */
  async getTeacherContext(muallimId: string) {
    if (!muallimId) {
      return {
        user: null,
        assignedClasses: [],
        assignedClassIds: [] as mongoose.Types.ObjectId[],
        assignedClassNames: [] as string[],
      };
    }

    let user = mongoose.Types.ObjectId.isValid(muallimId)
      ? await User.findById(muallimId)
      : null;

    if (!user) {
      // Fallback: Check if muallimId matches an email, or is a Better Auth user record
      try {
        user = await User.findOne({
          $or: [
            { email: muallimId.toLowerCase() },
            { phone: muallimId },
          ],
        });

        if (!user && mongoose.connection.db) {
          const baUser = await mongoose.connection.db.collection("user").findOne({
            $or: [
              ...(mongoose.Types.ObjectId.isValid(muallimId) ? [{ _id: new mongoose.Types.ObjectId(muallimId) }] : []),
              { id: muallimId },
            ],
          });
          if (baUser && (baUser.email || baUser.phone)) {
            user = await User.findOne({
              $or: [
                ...(baUser.email ? [{ email: String(baUser.email).toLowerCase() }] : []),
                ...(baUser.phone ? [{ phone: baUser.phone }] : []),
              ],
            });
          }
        }
      } catch {
        // ignore fallback error
      }
    }

    if (!user) {
      return {
        user: null,
        assignedClasses: [],
        assignedClassIds: [] as mongoose.Types.ObjectId[],
        assignedClassNames: [] as string[],
      };
    }

    // 1. Parse raw assigned classes string array or JSON
    let rawClasses: string[] = [];
    if (Array.isArray(user.assignedClasses)) {
      rawClasses = user.assignedClasses;
    } else if (typeof user.assignedClasses === "string") {
      try {
        const parsed = JSON.parse(user.assignedClasses);
        rawClasses = Array.isArray(parsed) ? parsed : [user.assignedClasses];
      } catch {
        rawClasses = [user.assignedClasses];
      }
    }

    const normalizedClassStrings = rawClasses
      .map((c) => String(c).trim())
      .filter(Boolean);

    // 2. Build regex queries for class names
    const classQueries = normalizedClassStrings.map((cls) => {
      const cleanNum = cls.replace(/^Class\s*/i, "").trim();
      return new RegExp(`^Class\\s*${cleanNum}$|^${cleanNum}$`, "i");
    });

    let classes: any[] = [];

    if (user.role === "SADHR_MUALLIM") {
      // Sadhr Muallim (Headmaster) oversees all classes
      classes = await Class.find({ isActive: true });
    } else if (normalizedClassStrings.length > 0) {
      // User has explicitly configured assignedClasses (e.g. ["7", "6"])
      classes = await Class.find({ name: { $in: classQueries }, isActive: true });

    } else {
      // Normal Muallim without explicit assignedClasses in user profile: fallback to classTeacherId or Timetable
      const orConditions: any[] = [{ classTeacherId: user._id }];
      const timetableClasses = await TimetablePeriod.find({
        teacherId: user._id,
        isActive: true,
      }).distinct("classId");

      if (timetableClasses.length > 0) {
        orConditions.push({ _id: { $in: timetableClasses } });
      }

      classes = await Class.find({ $or: orConditions, isActive: true });
    }

    // Deduplicate classes by _id
    const seenIds = new Set<string>();
    const uniqueClasses = classes.filter((c) => {
      const idStr = c._id.toString();
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });

    const assignedClassIds = uniqueClasses.map((c) => c._id as mongoose.Types.ObjectId);
    const assignedClassNames = uniqueClasses.map((c) => c.name);

    return {
      user,
      assignedClasses: uniqueClasses,
      assignedClassIds,
      assignedClassNames,
    };
  }

  /**
   * Helper: Check if a class ID or name is within teacher's assigned classes
   */
  isClassAssignedToTeacher(
    classIdOrName: string | mongoose.Types.ObjectId,
    assignedClassIds: mongoose.Types.ObjectId[],
    assignedClassNames: string[]
  ): boolean {
    const strVal = String(classIdOrName || "").trim();
    if (!strVal) return false;

    if (mongoose.Types.ObjectId.isValid(strVal)) {
      if (assignedClassIds.some((id) => id.toString() === strVal)) {
        return true;
      }
    }

    const cleanNum = strVal.replace(/^Class\s*/i, "").trim().toLowerCase();
    return assignedClassNames.some((name) => {
      const assignedNum = name.replace(/^Class\s*/i, "").trim().toLowerCase();
      return assignedNum === cleanNum || name.toLowerCase() === strVal.toLowerCase();
    });
  }

  /**
   * Get classes assigned to a Muallim (or Sadhr Muallim as a teacher)
   */
  async getAssignedClasses(muallimId: string) {
    const context = await this.getTeacherContext(muallimId);
    return context.assignedClasses;
  }

  /**
   * Get all active students enrolled in a specific class
   */
  async getClassStudents(classId: string, muallimId?: string) {
    if (muallimId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        return [];
      }
    }

    let targetClassId = classId;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      const cleanClsName = classId.replace(/^Class\s*/i, "").trim();
      const cls = await Class.findOne({
        name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
        isActive: true,
      });
      if (cls) {
        targetClassId = cls._id.toString();
      } else {
        return [];
      }
    }

    const students = await Student.find({
      classId: new mongoose.Types.ObjectId(targetClassId),
      isActive: true,
    })
      .populate("parentId", "name phone email")
      .populate("classId", "name division")
      .sort({ name: 1 });

    return students;
  }

  /**
   * Get executive stats for the logged-in Muallim dashboard
   */
  async getMuallimDashboardStats(muallimId: string): Promise<MuallimDashboardStats> {
    const assignedClasses = await this.getAssignedClasses(muallimId);
    const classIds = assignedClasses.map((c) => c._id);

    const totalStudents = await Student.countDocuments({
      classId: { $in: classIds },
      isActive: true,
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todayAttendance = await Attendance.find({
      classId: { $in: classIds },
      date: today,
    }).select("status");
    const todayAttendanceCount = todayAttendance.length;
    const countedAttendance = todayAttendance.filter((record) => record.status !== "HOLIDAY");
    const presentAttendance = countedAttendance.filter((record) => record.status === "PRESENT").length;
    const todayAttendancePercentage = countedAttendance.length > 0
      ? Number(((presentAttendance / countedAttendance.length) * 100).toFixed(1))
      : 0;

    const recentHifzRecordsCount = await HifzRecord.countDocuments({
      classId: { $in: classIds },
    });

    const recentEvaluationsCount = await PracticalEvaluation.countDocuments({
      classId: { $in: classIds },
    });

    const awardsGivenCount = mongoose.Types.ObjectId.isValid(muallimId)
      ? await Achievement.countDocuments({
          awardedById: new mongoose.Types.ObjectId(muallimId),
          isActive: true,
        })
      : 0;

    return {
      assignedClassesCount: assignedClasses.length,
      totalAssignedStudents: totalStudents,
      todayAttendanceMarked: todayAttendanceCount > 0,
      todayAttendancePercentage,
      recentHifzRecordsCount,
      recentEvaluationsCount,
      awardsGivenCount,
    };
  }

  /**
   * =========================================================================
   * PRACTICAL SUBJECT MANAGEMENT FUNCTIONS
   * =========================================================================
   */

  /**
   * Add a new practical subject for a class
   */
  async addPracticalSubject(
    data: CreatePracticalSubjectDTO,
    muallimId?: string
  ): Promise<PracticalSubjectResponseDTO> {
    const rawClass = String(data.classId || "").trim();
    if (!rawClass) {
      throw new Error("Class ID is required");
    }

    let classObjectId: mongoose.Types.ObjectId | undefined = undefined;
    let className: string = "";

    if (mongoose.Types.ObjectId.isValid(rawClass)) {
      const classExists = await Class.findById(rawClass);
      if (classExists) {
        classObjectId = classExists._id as mongoose.Types.ObjectId;
        className = classExists.name;
      }
    }

    if (!classObjectId) {
      const cleanClsName = rawClass.replace(/^Class\s*/i, "").trim();
      const targetClass = await Class.findOne({
        name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
        isActive: true,
      });
      if (!targetClass) {
        throw new Error(`Class "${rawClass}" not found`);
      }
      classObjectId = targetClass._id as mongoose.Types.ObjectId;
      className = targetClass.name;
    }

    if (muallimId && classObjectId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        classObjectId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: You can only add practical subjects to your assigned classes");
      }
    }

    const cleanName = data.name.trim();
    const validatedMaxScore = data.maxScore !== undefined
      ? Math.min(100, Math.max(1, Math.round(Number(data.maxScore)) || 5))
      : 5;

    // Check for duplicate active subject in this class
    const existing = await PracticalSubject.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, "i") },
      classId: classObjectId,
      isActive: true,
    });

    if (existing) {
      throw new Error(`Practical subject "${cleanName}" already exists for ${className || "this class"}`);
    }

    const practicalSubject = await PracticalSubject.create({
      name: cleanName,
      classId: classObjectId,
      maxScore: validatedMaxScore,
      isActive: true,
    });

    await practicalSubject.populate("classId", "name");

    return formatPracticalSubjectResponse(practicalSubject);
  }

  /**
   * Get all active practical subjects (optionally filtered by class and teacher assignment)
   */
  async getPracticalSubjects(
    classId?: string,
    muallimId?: string
  ): Promise<PracticalSubjectResponseDTO[]> {
    let allowedClassIds: mongoose.Types.ObjectId[] | null = null;

    if (muallimId) {
      const context = await this.getTeacherContext(muallimId);
      if (context.assignedClasses.length === 0) {
        return [];
      }
      allowedClassIds = context.assignedClassIds;

      if (classId && classId.trim() !== "" && classId.toUpperCase() !== "ALL") {
        const isAllowed = this.isClassAssignedToTeacher(
          classId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          return [];
        }
      }
    }

    const query: any = { isActive: true };

    if (classId && classId.trim() !== "" && classId.toUpperCase() !== "ALL") {
      if (mongoose.Types.ObjectId.isValid(classId)) {
        query.classId = new mongoose.Types.ObjectId(classId);
      } else {
        const cleanClsName = classId.replace(/^Class\s*/i, "").trim();
        const found = await Class.findOne({
          name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
          isActive: true,
        });
        if (found) {
          query.classId = found._id;
        } else {
          return [];
        }
      }
    } else if (allowedClassIds) {
      query.classId = { $in: allowedClassIds };
    }

    const subjects = await PracticalSubject.find(query)
      .populate("classId", "name")
      .sort({ name: 1 });

    return subjects.map((s) => formatPracticalSubjectResponse(s));
  }

  /**
   * Get single practical subject by ID
   */
  async getPracticalSubjectById(
    id: string,
    muallimId?: string
  ): Promise<PracticalSubjectResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid practical subject ID");
    }

    const subject = await PracticalSubject.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    }).populate("classId", "name");

    if (!subject) {
      throw new Error("Practical subject not found or inactive");
    }

    if (muallimId && subject.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        subject.classId._id || subject.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: Practical subject not assigned to you");
      }
    }

    return formatPracticalSubjectResponse(subject);
  }

  /**
   * Update practical subject details
   */
  async updatePracticalSubject(
    id: string,
    data: UpdatePracticalSubjectDTO,
    muallimId?: string
  ): Promise<PracticalSubjectResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid practical subject ID");
    }

    const subject = await PracticalSubject.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    });

    if (!subject) {
      throw new Error("Practical subject not found or inactive");
    }

    if (muallimId && subject.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        subject.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: You do not have permission to update this practical subject");
      }
    }

    // Update target class if provided
    if (data.classId !== undefined) {
      const classObjectId = await this.resolveClassObjectId(data.classId);

      if (muallimId) {
        const context = await this.getTeacherContext(muallimId);
        const isAllowed = this.isClassAssignedToTeacher(
          classObjectId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          throw new Error("Unauthorized: Target class is not assigned to you");
        }
      }

      subject.classId = classObjectId;
    }

    // Update name if provided
    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      const duplicate = await PracticalSubject.findOne({
        name: { $regex: new RegExp(`^${cleanName}$`, "i") },
        classId: subject.classId,
        _id: { $ne: subject._id },
        isActive: true,
      });

      if (duplicate) {
        throw new Error(`Another practical subject named "${cleanName}" already exists for this class`);
      }

      subject.name = cleanName;
    }

    // Update maxScore if provided
    if (data.maxScore !== undefined) {
      subject.maxScore = Math.min(100, Math.max(1, Math.round(Number(data.maxScore)) || 5));
    }

    // Update isActive if provided
    if (data.isActive !== undefined) {
      subject.isActive = data.isActive;
    }

    await subject.save();
    await subject.populate("classId", "name");

    return formatPracticalSubjectResponse(subject);
  }

  /**
   * Remove / Soft-delete a practical subject
   */
  async removePracticalSubject(
    id: string,
    muallimId?: string
  ): Promise<{ success: boolean; message: string; deletedId: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid practical subject ID");
    }

    const subject = await PracticalSubject.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    });

    if (!subject) {
      throw new Error("Practical subject not found or already removed");
    }

    if (muallimId && subject.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        subject.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: You do not have permission to remove this practical subject");
      }
    }

    // Soft delete by setting isActive to false
    subject.isActive = false;
    await subject.save();

    return {
      success: true,
      message: `Practical subject "${subject.name}" removed successfully`,
      deletedId: subject._id.toString(),
    };
  }

  /**
   * =========================================================================
   * ACADEMIC SUBJECT MANAGEMENT FUNCTIONS (Add, Edit/Update, Remove)
   * =========================================================================
   */

  /**
   * Add a new academic subject for a specific class
   */
  async addSubject(
    data: CreateSubjectDTO,
    muallimId?: string
  ): Promise<SubjectResponseDTO> {
    const cleanName = data.name.trim();

    let classObjectId: mongoose.Types.ObjectId | undefined = undefined;
    let targetClassName: string = "";
    if (data.classId && data.classId.trim() !== "" && data.classId.toUpperCase() !== "ALL") {
      const rawClass = data.classId.trim();
      if (mongoose.Types.ObjectId.isValid(rawClass)) {
        const classExists = await Class.findById(rawClass);
        if (classExists) {
          classObjectId = classExists._id as mongoose.Types.ObjectId;
          targetClassName = classExists.name;
        }
      }

      if (!classObjectId) {
        const cleanClsName = rawClass.replace(/^Class\s*/i, "").trim();
        const targetClass = await Class.findOne({
          name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
          isActive: true,
        });
        if (!targetClass) {
          throw new Error(`Class "${rawClass}" not found`);
        }
        classObjectId = targetClass._id as mongoose.Types.ObjectId;
        targetClassName = targetClass.name;
      }
    }

    // Verify teacher authorization for this class (supports ObjectId, class name, or class number representation)
    if (muallimId && classObjectId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed =
        this.isClassAssignedToTeacher(classObjectId, context.assignedClassIds, context.assignedClassNames) ||
        (targetClassName ? this.isClassAssignedToTeacher(targetClassName, context.assignedClassIds, context.assignedClassNames) : false) ||
        (data.classId ? this.isClassAssignedToTeacher(data.classId, context.assignedClassIds, context.assignedClassNames) : false);
      if (!isAllowed) {
        throw new Error("Unauthorized: You can only add subjects to your assigned classes");
      }
    }

    const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const query: any = {
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
      isActive: true,
    };
    if (classObjectId) {
      query.classId = classObjectId;
    } else {
      query.$or = [{ classId: { $exists: false } }, { classId: null }];
    }

    const existing = await Subject.findOne(query);
    if (existing) {
      throw new Error(`Subject "${cleanName}" already exists for this class`);
    }

    const subject = await Subject.create({
      name: cleanName,
      arabicTitle: data.arabicTitle?.trim() || "",
      malayalamTitle: data.malayalamTitle?.trim() || "",
      classId: classObjectId || null,
      description: data.description?.trim() || "",
      color: data.color || "#0F6B50",
      icon: data.icon || "BookOpen",
      isActive: true,
    });

    if (classObjectId && subject) {
      await subject.populate("classId", "name");
    }

    return formatSubjectResponse(subject);
  }

  /**
   * Get all active academic subjects (filtered strictly by class and teacher assignment)
   */
  async getSubjects(
    classId?: string,
    muallimId?: string
  ): Promise<SubjectResponseDTO[]> {
    // 1. Resolve teacher context if muallimId is provided
    let assignedClassIds: mongoose.Types.ObjectId[] | null = null;
    let assignedClassNames: string[] = [];

    if (muallimId) {
      const context = await this.getTeacherContext(muallimId);
      if (context.assignedClasses.length === 0) {
        return [];
      }
      assignedClassIds = context.assignedClassIds;
      assignedClassNames = context.assignedClassNames;
    }

    // 2. If a specific classId is provided, query strictly for that class
    let targetClassObjectId: mongoose.Types.ObjectId | undefined = undefined;
    if (classId && classId.trim() !== "" && classId.toUpperCase() !== "ALL") {
      const rawClass = classId.trim();

      // Authorization check for specific class
      if (assignedClassIds && assignedClassNames.length > 0) {
        const isAllowed = this.isClassAssignedToTeacher(
          rawClass,
          assignedClassIds,
          assignedClassNames
        );
        if (!isAllowed) {
          return []; // Requester is not assigned to this class
        }
      }

      if (mongoose.Types.ObjectId.isValid(rawClass)) {
        const foundById = await Class.findById(rawClass);
        if (foundById) {
          targetClassObjectId = foundById._id as mongoose.Types.ObjectId;
        }
      }

      if (!targetClassObjectId) {
        const cleanClsName = rawClass.replace(/^Class\s*/i, "").trim();
        const found = await Class.findOne({
          name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
          isActive: true,
        });
        if (!found) {
          return [];
        }
        targetClassObjectId = found._id as mongoose.Types.ObjectId;
      }
    }

    if (targetClassObjectId) {
      const subjects = await Subject.find({
        classId: targetClassObjectId,
        isActive: true,
      })
        .populate("classId", "name")
        .sort({ createdAt: 1 });

      return subjects.map((s) => formatSubjectResponse(s));
    }

    // 3. When querying all subjects (no classId provided):
    // If teacher context exists, restrict query to assigned classes ONLY
    if (assignedClassIds && assignedClassIds.length > 0) {
      const subjects = await Subject.find({
        classId: { $in: assignedClassIds },
        isActive: true,
      })
        .populate("classId", "name")
        .sort({ createdAt: 1 });

      return subjects.map((s) => formatSubjectResponse(s));
    }

    const subjects = await Subject.find({ isActive: true })
      .populate("classId", "name")
      .sort({ createdAt: 1 });

    return subjects.map((s) => formatSubjectResponse(s));
  }

  /**
   * Get single academic subject by ID (with teacher authorization check)
   */
  async getSubjectById(id: string, muallimId?: string): Promise<SubjectResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid subject ID");
    }

    const subject = await Subject.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    }).populate("classId", "name");

    if (!subject) {
      throw new Error("Subject not found or inactive");
    }

    if (muallimId && subject.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        subject.classId._id || subject.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: Subject not assigned to your classes");
      }
    }

    return formatSubjectResponse(subject);
  }

  /**
   * Edit / Update academic subject details
   */
  async updateSubject(
    id: string,
    data: UpdateSubjectDTO,
    muallimId?: string
  ): Promise<SubjectResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid subject ID");
    }

    const subject = await Subject.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    });

    if (!subject) {
      throw new Error("Subject not found or inactive");
    }

    if (muallimId && subject.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        subject.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: You do not have permission to update subjects for this class");
      }
    }

    // Update target class if provided
    if (data.classId !== undefined) {
      const rawClass = typeof data.classId === "string" ? data.classId.trim() : "";
      if (rawClass !== "") {
        let resolvedClass: any = null;

        if (mongoose.Types.ObjectId.isValid(rawClass)) {
          resolvedClass = await Class.findOne({
            _id: new mongoose.Types.ObjectId(rawClass),
            isActive: true,
          });
        }

        if (!resolvedClass) {
          const cleanClsName = rawClass.replace(/^Class\s*/i, "").trim();
          resolvedClass = await Class.findOne({
            name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
            isActive: true,
          });
        }

        if (!resolvedClass) {
          throw new Error("Class not found");
        }

        if (muallimId) {
          const context = await this.getTeacherContext(muallimId);
          const isAllowed = this.isClassAssignedToTeacher(
            resolvedClass._id,
            context.assignedClassIds,
            context.assignedClassNames
          );
          if (!isAllowed) {
            throw new Error("Unauthorized: Target class is not assigned to you");
          }
        }

        subject.classId = resolvedClass._id as mongoose.Types.ObjectId;
      } else {
        subject.classId = null;
      }
    }

    // Update name if provided
    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      const duplicateQuery: any = {
        name: { $regex: new RegExp(`^${cleanName}$`, "i") },
        _id: { $ne: subject._id },
        isActive: true,
      };
      if (subject.classId) {
        duplicateQuery.classId = subject.classId;
      } else {
        duplicateQuery.$or = [{ classId: { $exists: false } }, { classId: null }];
      }

      const duplicate = await Subject.findOne(duplicateQuery);
      if (duplicate) {
        throw new Error(`Another subject named "${cleanName}" already exists`);
      }

      subject.name = cleanName;
    }

    if (data.arabicTitle !== undefined) {
      subject.arabicTitle = data.arabicTitle.trim();
    }

    if (data.malayalamTitle !== undefined) {
      subject.malayalamTitle = data.malayalamTitle.trim();
    }

    if (data.description !== undefined) {
      subject.description = data.description.trim();
    }

    if (data.color !== undefined) {
      subject.color = data.color;
    }

    if (data.icon !== undefined) {
      subject.icon = data.icon;
    }

    // Update isActive if provided
    if (data.isActive !== undefined) {
      subject.isActive = data.isActive;
    }

    await subject.save();
    if (subject.classId) {
      await subject.populate("classId", "name");
    }

    return formatSubjectResponse(subject);
  }

  /**
   * Remove / Delete an academic subject
   */
  async removeSubject(
    id: string,
    muallimId?: string
  ): Promise<{ success: boolean; message: string; deletedId: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid subject ID");
    }

    const subject = await Subject.findOne({
      _id: new mongoose.Types.ObjectId(id),
    });

    if (!subject) {
      throw new Error("Subject not found");
    }

    if (muallimId && subject.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        subject.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: You do not have permission to remove subjects from this class");
      }
    }

    await Subject.findByIdAndDelete(id);

    return {
      success: true,
      message: `Subject "${subject.name}" deleted successfully`,
      deletedId: id,
    };
  }

  /**
   * =========================================================================
   * AWARDS & ACHIEVEMENTS FUNCTIONS (Create, Delete/Remove, Query)
   * =========================================================================
   */

  /**
   * Create / Award an achievement or badge to a student
   */
  async createAchievement(
    data: CreateAchievementDTO,
    teacherId: string
  ): Promise<AchievementResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(data.studentId)) {
      throw new Error("Invalid student ID provided");
    }

    // Verify student existence
    const student = await Student.findOne({
      _id: new mongoose.Types.ObjectId(data.studentId),
      isActive: true,
    });

    if (!student) {
      throw new Error("Target student not found or inactive");
    }

    if (teacherId) {
      const context = await this.getTeacherContext(teacherId);
      if (student.classId) {
        const isAllowed = this.isClassAssignedToTeacher(
          student.classId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          throw new Error("Unauthorized: Student belongs to a class not assigned to you");
        }
      }
    }

    const classId = data.classId || (student.classId ? student.classId.toString() : undefined);

    const achievement = await Achievement.create({
      studentId: student._id,
      ...(classId && mongoose.Types.ObjectId.isValid(classId)
        ? { classId: new mongoose.Types.ObjectId(classId) }
        : {}),
      title: data.title.trim(),
      ...(data.titleMalayalam ? { titleMalayalam: data.titleMalayalam.trim() } : {}),
      category: data.category?.trim() || "General Achievement",
      description: data.description.trim(),
      badgeIcon: data.badgeIcon || "🏆",
      date: data.date ? new Date(data.date) : new Date(),
      awardedById: new mongoose.Types.ObjectId(teacherId),
      isActive: true,
    });

    await achievement.populate([
      { path: "studentId", select: "name" },
      { path: "classId", select: "name" },
      { path: "awardedById", select: "name" },
    ]);

    return formatAchievementResponse(achievement);
  }

  /**
   * Get all active awards and achievements (optionally filtered by student, class or teacher)
   */
  async getAchievements(filter?: {
    studentId?: string | undefined;
    classId?: string | undefined;
    muallimId?: string | undefined;
  }): Promise<AchievementResponseDTO[]> {
    const query: any = { isActive: true };

    if (filter?.muallimId) {
      const context = await this.getTeacherContext(filter.muallimId);
      if (context.assignedClasses.length === 0) {
        return [];
      }
      if (filter.classId) {
        const isAllowed = this.isClassAssignedToTeacher(
          filter.classId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) return [];
      } else {
        query.classId = { $in: context.assignedClassIds };
      }
    }

    if (filter?.studentId && mongoose.Types.ObjectId.isValid(filter.studentId)) {
      query.studentId = new mongoose.Types.ObjectId(filter.studentId);
    }

    if (filter?.classId && mongoose.Types.ObjectId.isValid(filter.classId)) {
      query.classId = new mongoose.Types.ObjectId(filter.classId);
    }

    const records = await Achievement.find(query)
      .populate("studentId", "name")
      .populate("classId", "name")
      .populate("awardedById", "name")
      .sort({ date: -1, createdAt: -1 });

    return records.map((r) => formatAchievementResponse(r));
  }

  /**
   * Get single award / achievement by ID
   */
  async getAchievementById(
    id: string,
    muallimId?: string
  ): Promise<AchievementResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid achievement ID");
    }

    const record = await Achievement.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    })
      .populate("studentId", "name")
      .populate("classId", "name")
      .populate("awardedById", "name");

    if (!record) {
      throw new Error("Achievement / Award not found or inactive");
    }

    if (muallimId && record.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        record.classId._id || record.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: Achievement belongs to a class not assigned to you");
      }
    }

    return formatAchievementResponse(record);
  }

  /**
   * Delete / Soft-delete an award or achievement
   */
  async deleteAchievement(
    id: string,
    muallimId?: string
  ): Promise<{ success: boolean; message: string; deletedId: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid achievement ID");
    }

    const record = await Achievement.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    });

    if (!record) {
      throw new Error("Achievement / Award not found or already deleted");
    }

    if (muallimId && record.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        record.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: You do not have permission to delete this achievement");
      }
    }

    // Soft delete
    record.isActive = false;
    await record.save();

    return {
      success: true,
      message: `Achievement / Award "${record.title}" removed successfully`,
      deletedId: record._id.toString(),
    };
  }

  /**
   * =========================================================================
   * TIMETABLE & PERIOD MANAGEMENT FUNCTIONS (Add, Edit/Update, Delete)
   * =========================================================================
   */

  /**
   * Add a new period to a class timetable
   */
  async addPeriod(
    data: CreatePeriodDTO,
    muallimId?: string
  ): Promise<PeriodResponseDTO> {
    const rawClass = (data.classId || "").trim();
    if (!rawClass) {
      throw new Error("Class ID is required");
    }

    let targetClass: any = null;

    if (mongoose.Types.ObjectId.isValid(rawClass)) {
      targetClass = await Class.findById(rawClass);
    }

    if (!targetClass) {
      const cleanClsName = rawClass.replace(/^Class\s*/i, "").trim();
      targetClass = await Class.findOne({
        name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
        isActive: true,
      });
    }

    if (!targetClass) {
      throw new Error("Target class not found");
    }

    const resolvedClassId = targetClass._id as mongoose.Types.ObjectId;

    if (muallimId) {
      const context = await this.getTeacherContext(muallimId);
      const isSuperUser = (context.user?.role as string) === "SADHR_MUALLIM" || (context.user?.role as string) === "ADMIN";
      if (!isSuperUser) {
        const isAllowed = this.isClassAssignedToTeacher(
          resolvedClassId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          throw new Error("Unauthorized: You can only configure timetable for your assigned classes");
        }
      }
    }

    // Check for duplicate period on the same day for this class
    const existing = await TimetablePeriod.findOne({
      classId: resolvedClassId,
      day: data.day,
      periodNumber: data.periodNumber,
      isActive: true,
    });

    if (existing) {
      throw new Error(
        `Period ${data.periodNumber} for ${data.day} already exists for ${targetClass.name}`
      );
    }

    const period = await TimetablePeriod.create({
      classId: resolvedClassId,
      day: data.day,
      periodNumber: data.periodNumber,
      startTime: data.startTime.trim(),
      endTime: data.endTime.trim(),
      subject: data.subject.trim(),
      ...(data.subjectMalayalam ? { subjectMalayalam: data.subjectMalayalam.trim() } : {}),
      ...(data.teacherName ? { teacherName: data.teacherName.trim() } : {}),
      ...(data.teacherId && mongoose.Types.ObjectId.isValid(data.teacherId)
        ? { teacherId: new mongoose.Types.ObjectId(data.teacherId) }
        : {}),
      ...(data.room ? { room: data.room.trim() } : {}),
      ...(data.notes ? { notes: data.notes.trim() } : {}),
      isActive: true,
    });

    await period.populate([
      { path: "classId", select: "name" },
      { path: "teacherId", select: "name" },
    ]);

    return formatPeriodResponse(period);
  }

  /**
   * Get all active periods for a class or day (filtered by teacher assignment if muallimId provided)
   */
  async getPeriods(filter?: {
    classId?: string | undefined;
    day?: MadrasaDay | undefined;
    muallimId?: string | undefined;
  }): Promise<PeriodResponseDTO[]> {
    const query: any = { isActive: true };

    if (filter?.muallimId) {
      const context = await this.getTeacherContext(filter.muallimId);
      const isSuperUser = (context.user?.role as string) === "SADHR_MUALLIM" || (context.user?.role as string) === "ADMIN";

      if (!isSuperUser) {
        if (context.assignedClasses.length === 0) {
          return [];
        }

        if (filter.classId && filter.classId.trim() !== "" && filter.classId.toUpperCase() !== "ALL") {
          const isAllowed = this.isClassAssignedToTeacher(
            filter.classId,
            context.assignedClassIds,
            context.assignedClassNames
          );
          if (!isAllowed) {
            return [];
          }
        } else {
          query.classId = { $in: context.assignedClassIds };
        }
      }
    }

    if (filter?.classId && filter.classId.trim() !== "" && filter.classId.toUpperCase() !== "ALL") {
      if (mongoose.Types.ObjectId.isValid(filter.classId)) {
        query.classId = new mongoose.Types.ObjectId(filter.classId);
      } else {
        const cleanClsName = filter.classId.replace(/^Class\s*/i, "").trim();
        const cls = await Class.findOne({
          name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
          isActive: true,
        });
        if (cls) {
          query.classId = cls._id;
        } else {
          return [];
        }
      }
    }

    if (filter?.day) {
      query.day = filter.day;
    }

    const periods = await TimetablePeriod.find(query)
      .populate("classId", "name")
      .populate("teacherId", "name")
      .sort({ day: 1, periodNumber: 1 });

    return periods.map((p) => formatPeriodResponse(p));
  }

  /**
   * Get single timetable period by ID
   */
  async getPeriodById(id: string, muallimId?: string): Promise<PeriodResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid period ID");
    }

    const period = await TimetablePeriod.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    })
      .populate("classId", "name")
      .populate("teacherId", "name");

    if (!period) {
      throw new Error("Timetable period not found or inactive");
    }

    if (muallimId && period.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isAllowed = this.isClassAssignedToTeacher(
        period.classId._id || period.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        throw new Error("Unauthorized: Timetable period belongs to an unassigned class");
      }
    }

    return formatPeriodResponse(period);
  }

  /**
   * Edit / Update a timetable period
   */
  async updatePeriod(
    id: string,
    data: UpdatePeriodDTO,
    muallimId?: string
  ): Promise<PeriodResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid period ID");
    }

    const period = await TimetablePeriod.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    });

    if (!period) {
      throw new Error("Timetable period not found or inactive");
    }

    if (muallimId && period.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isSuperUser = (context.user?.role as string) === "SADHR_MUALLIM" || (context.user?.role as string) === "ADMIN";
      if (!isSuperUser) {
        const isAllowed = this.isClassAssignedToTeacher(
          period.classId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          throw new Error("Unauthorized: You do not have permission to update timetable for this class");
        }
      }
    }

    // Update target class if provided
    if (data.classId !== undefined) {
      const rawClass = data.classId.trim();
      let targetClass: any = null;

      if (mongoose.Types.ObjectId.isValid(rawClass)) {
        targetClass = await Class.findById(rawClass);
      }

      if (!targetClass) {
        const cleanClsName = rawClass.replace(/^Class\s*/i, "").trim();
        targetClass = await Class.findOne({
          name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
          isActive: true,
        });
      }

      if (!targetClass) {
        throw new Error("Target class not found");
      }

      if (muallimId) {
        const context = await this.getTeacherContext(muallimId);
        const isSuperUser = (context.user?.role as string) === "SADHR_MUALLIM" || (context.user?.role as string) === "ADMIN";
        if (!isSuperUser) {
          const isAllowed = this.isClassAssignedToTeacher(
            targetClass._id,
            context.assignedClassIds,
            context.assignedClassNames
          );
          if (!isAllowed) {
            throw new Error("Unauthorized: Target class is not assigned to you");
          }
        }
      }
      period.classId = targetClass._id as mongoose.Types.ObjectId;
    }

    const targetDay = data.day || period.day;
    const targetPeriodNumber =
      data.periodNumber !== undefined ? data.periodNumber : period.periodNumber;

    // Check duplicate if day or periodNumber changed
    if (data.day !== undefined || data.periodNumber !== undefined) {
      const duplicate = await TimetablePeriod.findOne({
        classId: period.classId,
        day: targetDay,
        periodNumber: targetPeriodNumber,
        _id: { $ne: period._id },
        isActive: true,
      });

      if (duplicate) {
        throw new Error(
          `Period ${targetPeriodNumber} for ${targetDay} already exists for this class`
        );
      }

      period.day = targetDay;
      period.periodNumber = targetPeriodNumber;
    }

    if (data.startTime !== undefined) {
      period.startTime = data.startTime.trim();
    }

    if (data.endTime !== undefined) {
      period.endTime = data.endTime.trim();
    }

    if (data.subject !== undefined) {
      period.subject = data.subject.trim();
    }

    if (data.subjectMalayalam !== undefined) {
      period.subjectMalayalam = data.subjectMalayalam.trim();
    }

    if (data.teacherName !== undefined) {
      period.teacherName = data.teacherName.trim();
    }

    if (data.teacherId !== undefined) {
      if (data.teacherId && mongoose.Types.ObjectId.isValid(data.teacherId)) {
        period.teacherId = new mongoose.Types.ObjectId(data.teacherId);
      } else {
        period.set("teacherId", undefined);
      }
    }

    if (data.room !== undefined) {
      period.room = data.room.trim();
    }

    if (data.notes !== undefined) {
      period.notes = data.notes.trim();
    }

    if (data.isActive !== undefined) {
      period.isActive = data.isActive;
    }

    await period.save();
    await period.populate([
      { path: "classId", select: "name" },
      { path: "teacherId", select: "name" },
    ]);

    return formatPeriodResponse(period);
  }

  /**
   * Delete a timetable period permanently from MongoDB
   */
  async deletePeriod(
    id: string,
    muallimId?: string
  ): Promise<{ success: boolean; message: string; deletedId: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid period ID");
    }

    const period = await TimetablePeriod.findById(id);

    if (!period) {
      throw new Error("Timetable period not found or already deleted");
    }

    if (muallimId && period.classId) {
      const context = await this.getTeacherContext(muallimId);
      const isSuperUser = (context.user?.role as string) === "SADHR_MUALLIM" || (context.user?.role as string) === "ADMIN";
      if (!isSuperUser) {
        const isAllowed = this.isClassAssignedToTeacher(
          period.classId,
          context.assignedClassIds,
          context.assignedClassNames
        );
        if (!isAllowed) {
          throw new Error("Unauthorized: You do not have permission to delete this timetable period");
        }
      }
    }

    // Permanent hard delete from MongoDB
    await TimetablePeriod.findByIdAndDelete(id);

    return {
      success: true,
      message: `Period ${period.periodNumber} (${period.subject}) for ${period.day} deleted successfully`,
      deletedId: period._id.toString(),
    };
  }
}

export const muallimService = new MuallimService();

