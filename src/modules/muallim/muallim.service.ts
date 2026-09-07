import mongoose from "mongoose";
import Attendance from "../../models/Attendance.js";
import HifzLog from "../../models/Hifz.js";
import PracticalEvaluation from "../practical/practical.model.js";
import PracticalSubject from "../../models/PracticalSubject.js";
import Subject from "../../models/Subject.js";
import Achievement from "../../models/Achievement.js";
import TimetablePeriod from "../../models/TimetablePeriod.js";
import Student from "../../models/Student.js";
import Class from "../../models/Class.js";
import User from "../../models/User.js";
import type {
  MarkClassAttendanceDTO,
  StudentAttendanceSummary,
  RecordHifzDTO,
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

export class MuallimService {
  /**
   * =========================================================================
   * ATTENDANCE MANAGEMENT FUNCTIONS
   * =========================================================================
   */

  /**
   * Bulk mark / upsert daily attendance for a class
   */
  async markClassAttendance(data: MarkClassAttendanceDTO, markedById: string) {
    const targetDate = new Date(data.date);
    // Normalize to beginning of day
    targetDate.setUTCHours(0, 0, 0, 0);

    const operations = data.records.map((record) => ({
      updateOne: {
        filter: {
          studentId: new mongoose.Types.ObjectId(record.studentId),
          date: targetDate,
        },
        update: {
          $set: {
            classId: new mongoose.Types.ObjectId(data.classId),
            status: record.status,
            remark: record.remark || "",
            markedById: new mongoose.Types.ObjectId(markedById),
            date: targetDate,
          },
        },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(operations);
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    };
  }

  /**
   * Get class attendance for a specific date
   */
  async getClassAttendanceByDate(classId: string, dateStr: string) {
    const targetDate = new Date(dateStr);
    targetDate.setUTCHours(0, 0, 0, 0);

    return Attendance.find({
      classId: new mongoose.Types.ObjectId(classId),
      date: targetDate,
    })
      .populate("studentId", "name admissionNumber gender")
      .populate("markedById", "name email");
  }

  /**
   * Get attendance history and statistics for a student
   */
  async getStudentAttendance(
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ records: any[]; summary: StudentAttendanceSummary }> {
    const query: any = { studentId: new mongoose.Types.ObjectId(studentId) };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(query).sort({ date: -1 });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === "PRESENT").length;
    const absentDays = records.filter((r) => r.status === "ABSENT").length;
    const lateDays = records.filter((r) => r.status === "LATE").length;
    const excusedDays = records.filter((r) => r.status === "EXCUSED").length;

    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    return {
      records,
      summary: {
        studentId,
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        excusedDays,
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
   * Log daily Quran recitation / Hifz / Muraja'ah session
   */
  async recordHifzLog(data: RecordHifzDTO, teacherId: string) {
    const entryDate = data.date ? new Date(data.date) : new Date();

    const log = await HifzLog.create({
      studentId: new mongoose.Types.ObjectId(data.studentId),
      classId: new mongoose.Types.ObjectId(data.classId),
      sessionType: data.sessionType || "SABAQ",
      surahNumber: data.surahNumber,
      surahName: data.surahName,
      fromAyah: data.fromAyah,
      toAyah: data.toAyah,
      rating: data.rating,
      mistakesCount: data.mistakesCount || 0,
      remarks: data.remarks || "",
      teacherId: new mongoose.Types.ObjectId(teacherId),
      date: entryDate,
    });

    return log;
  }

  /**
   * Get student's recent Quran recitation and Hifz history
   */
  async getStudentHifzHistory(studentId: string, limit = 20) {
    return HifzLog.find({ studentId: new mongoose.Types.ObjectId(studentId) })
      .sort({ date: -1 })
      .limit(limit)
      .populate("teacherId", "name");
  }

  /**
   * Get student's overall Hifz statistics and summary
   */
  async getStudentHifzSummary(studentId: string): Promise<StudentHifzSummary> {
    const logs = await HifzLog.find({
      studentId: new mongoose.Types.ObjectId(studentId),
    }).sort({ date: -1 });

    const totalRatings = logs.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = logs.length > 0 ? Number((totalRatings / logs.length).toFixed(1)) : 5.0;

    const uniqueSurahs = new Set(logs.map((l) => l.surahNumber));
    const latestLog = logs[0];

    return {
      studentId,
      totalMemorizedSurahs: uniqueSurahs.size,
      currentSurah: latestLog ? latestLog.surahName : "Al-Fatihah",
      currentAyah: latestLog ? latestLog.toAyah : 1,
      averageRating,
      recentLogs: logs.slice(0, 5),
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
    const totalScore = data.scores.reduce((sum, item) => sum + item.score, 0);
    const overallScore =
      data.scores.length > 0 ? Number((totalScore / data.scores.length).toFixed(1)) : 0;

    const evaluation = await PracticalEvaluation.create({
      studentId: new mongoose.Types.ObjectId(data.studentId),
      classId: new mongoose.Types.ObjectId(data.classId),
      term: data.term || "Monthly Evaluation",
      month: data.month || new Date().toISOString().slice(0, 7),
      scores: data.scores,
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
      totalEvaluations > 0 ? Number((totalScoreSum / totalEvaluations).toFixed(1)) : 8.5;

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
   * MUALLIM CLASSROOM & ROSTER FUNCTIONS
   * =========================================================================
   */

  /**
   * Get classes assigned to a Muallim
   */
  async getAssignedClasses(muallimId: string) {
    let classes: any[] = [];
    if (mongoose.Types.ObjectId.isValid(muallimId)) {
      classes = await Class.find({ classTeacherId: muallimId, isActive: true });
    }

    // If not found by direct relation, lookup user's assignedClasses string array
    if (classes.length === 0 && mongoose.Types.ObjectId.isValid(muallimId)) {
      const user = await User.findById(muallimId);
      if (user && user.assignedClasses && user.assignedClasses.length > 0) {
        const classQueries = user.assignedClasses.map((cls) => new RegExp(`^class\\s*${cls}$|^${cls}$`, "i"));
        classes = await Class.find({ name: { $in: classQueries }, isActive: true });
      }
    }

    return classes;
  }

  /**
   * Get all active students enrolled in a specific class
   */
  async getClassStudents(classId: string) {
    const students = await Student.find({
      classId: new mongoose.Types.ObjectId(classId),
      isActive: true,
    })
      .populate("parentId", "name phone email")
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

    const todayAttendanceCount = await Attendance.countDocuments({
      classId: { $in: classIds },
      date: today,
    });

    const recentHifzLogsCount = await HifzLog.countDocuments({
      classId: { $in: classIds },
    });

    const recentEvaluationsCount = await PracticalEvaluation.countDocuments({
      classId: { $in: classIds },
    });

    return {
      assignedClassesCount: assignedClasses.length,
      totalAssignedStudents: totalStudents,
      todayAttendanceMarked: todayAttendanceCount > 0,
      todayAttendancePercentage: 96.5,
      recentHifzLogsCount,
      recentEvaluationsCount,
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
  async addPracticalSubject(data: CreatePracticalSubjectDTO): Promise<PracticalSubjectResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(data.classId)) {
      throw new Error("Invalid class ID provided");
    }

    const cleanName = data.name.trim();

    // Verify class existence
    const classExists = await Class.findById(data.classId);
    if (!classExists) {
      throw new Error("Target class not found");
    }

    // Check for duplicate active subject in this class
    const existing = await PracticalSubject.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, "i") },
      classId: new mongoose.Types.ObjectId(data.classId),
      isActive: true,
    });

    if (existing) {
      throw new Error(`Practical subject "${cleanName}" already exists for ${classExists.name}`);
    }

    const practicalSubject = await PracticalSubject.create({
      name: cleanName,
      classId: new mongoose.Types.ObjectId(data.classId),
      isActive: true,
    });

    await practicalSubject.populate("classId", "name");

    return formatPracticalSubjectResponse(practicalSubject);
  }

  /**
   * Get all active practical subjects (optionally filtered by class)
   */
  async getPracticalSubjects(classId?: string): Promise<PracticalSubjectResponseDTO[]> {
    const query: any = { isActive: true };

    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.classId = new mongoose.Types.ObjectId(classId);
    }

    const subjects = await PracticalSubject.find(query)
      .populate("classId", "name")
      .sort({ name: 1 });

    return subjects.map((s) => formatPracticalSubjectResponse(s));
  }

  /**
   * Get single practical subject by ID
   */
  async getPracticalSubjectById(id: string): Promise<PracticalSubjectResponseDTO> {
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

    return formatPracticalSubjectResponse(subject);
  }

  /**
   * Update practical subject details
   */
  async updatePracticalSubject(
    id: string,
    data: UpdatePracticalSubjectDTO
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

    // Update target class if provided
    if (data.classId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(data.classId)) {
        throw new Error("Invalid class ID provided");
      }
      const classExists = await Class.findById(data.classId);
      if (!classExists) {
        throw new Error("Target class not found");
      }
      subject.classId = new mongoose.Types.ObjectId(data.classId);
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
  async removePracticalSubject(id: string): Promise<{ success: boolean; message: string; deletedId: string }> {
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
   * Add a new academic subject
   */
  async addSubject(data: CreateSubjectDTO): Promise<SubjectResponseDTO> {
    const cleanName = data.name.trim();

    let classObjectId: mongoose.Types.ObjectId | undefined = undefined;
    if (data.classId && data.classId.trim() !== "") {
      if (!mongoose.Types.ObjectId.isValid(data.classId)) {
        throw new Error("Invalid class ID provided");
      }
      const classExists = await Class.findById(data.classId);
      if (!classExists) {
        throw new Error("Target class not found");
      }
      classObjectId = new mongoose.Types.ObjectId(data.classId);
    }

    const query: any = {
      name: { $regex: new RegExp(`^${cleanName}$`, "i") },
      isActive: true,
    };
    if (classObjectId) {
      query.classId = classObjectId;
    } else {
      query.$or = [{ classId: { $exists: false } }, { classId: null }];
    }

    const existing = await Subject.findOne(query);
    if (existing) {
      throw new Error(`Subject "${cleanName}" already exists`);
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
   * Get all active academic subjects (optionally filtered by class, with auto-seed to MongoDB if collection empty)
   */
  async getSubjects(classId?: string): Promise<SubjectResponseDTO[]> {
    const totalCount = await Subject.countDocuments();
    if (totalCount === 0) {
      // Auto-seed default curriculum subjects directly into MongoDB
      const defaultSubjects = [
        {
          name: "Quran Tilawat",
          malayalamTitle: "ഖുർആൻ പാരായണം",
          arabicTitle: "تلاوة القرآن",
          description: "Proper pronunciation, rhythmic reading, and daily reading mastery",
          color: "#0F6B50",
          icon: "BookOpen",
        },
        {
          name: "Hifzul Quran",
          malayalamTitle: "ഹിഫ്ള്",
          arabicTitle: "حفظ القرآن",
          description: "Surah memorization, daily Sabaq lessons, and Sabaqi revision cycles",
          color: "#084C3A",
          icon: "BookmarkCheck",
        },
        {
          name: "Tajweed Rules",
          malayalamTitle: "തജ്‌വീദ്",
          arabicTitle: "التجويد",
          description: "Makharidj, Sifaat, Noon/Meem Sakinah and Madd articulation rules",
          color: "#3B8772",
          icon: "Mic",
        },
        {
          name: "Arabic Language",
          malayalamTitle: "അറബി ഭാഷ",
          arabicTitle: "اللغة العربية",
          description: "Vocabulary, grammar (Nahw/Sarf basics), comprehension and writing",
          color: "#1B735C",
          icon: "Languages",
        },
        {
          name: "Islamic Studies & Thareekh",
          malayalamTitle: "ഇസ്‌ലാമിക് സ്റ്റഡീസ് & താരീഖ്",
          arabicTitle: "التاريخ الإسلامي",
          description: "Seerah of Prophet (PBUH), companions, Islamic history and values",
          color: "#248268",
          icon: "GraduationCap",
        },
        {
          name: "Fiqh & Ahkam",
          malayalamTitle: "ഫിഖ്ഹ് (കർമ്മശാസ്ത്രം)",
          arabicTitle: "الفقه الإسلامي",
          description: "Taharah, Salah, Sawm, Zakah and everyday Islamic jurisprudence",
          color: "#165B47",
          icon: "Scale",
        },
        {
          name: "Akhlaq & Adab",
          malayalamTitle: "അഖ്‌ലാഖ് & ആദാബ്",
          arabicTitle: "الأخلاق والآداب",
          description: "Character building, respect for parents & teachers, manners and discipline",
          color: "#C9A227",
          icon: "HeartHandshake",
        },
      ];

      for (const subj of defaultSubjects) {
        await Subject.create({
          ...subj,
          isActive: true,
        });
      }
    }

    const query: any = { isActive: true };

    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.$or = [
        { classId: new mongoose.Types.ObjectId(classId) },
        { classId: { $exists: false } },
        { classId: null },
      ];
    }

    const subjects = await Subject.find(query)
      .populate("classId", "name")
      .sort({ createdAt: 1 });

    return subjects.map((s) => formatSubjectResponse(s));
  }

  /**
   * Get single academic subject by ID
   */
  async getSubjectById(id: string): Promise<SubjectResponseDTO> {
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

    return formatSubjectResponse(subject);
  }

  /**
   * Edit / Update academic subject details
   */
  async updateSubject(
    id: string,
    data: UpdateSubjectDTO
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

    // Update target class if provided
    if (data.classId !== undefined) {
      if (data.classId && data.classId.trim() !== "") {
        if (!mongoose.Types.ObjectId.isValid(data.classId)) {
          throw new Error("Invalid class ID provided");
        }
        const classExists = await Class.findById(data.classId);
        if (!classExists) {
          throw new Error("Target class not found");
        }
        subject.classId = new mongoose.Types.ObjectId(data.classId);
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
  async removeSubject(id: string): Promise<{ success: boolean; message: string; deletedId: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid subject ID");
    }

    const subject = await Subject.findOne({
      _id: new mongoose.Types.ObjectId(id),
    });

    if (!subject) {
      throw new Error("Subject not found");
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
   * Get all active awards and achievements (optionally filtered by student or class)
   */
  async getAchievements(filter?: {
    studentId?: string | undefined;
    classId?: string | undefined;
  }): Promise<AchievementResponseDTO[]> {
    const query: any = { isActive: true };

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
  async getAchievementById(id: string): Promise<AchievementResponseDTO> {
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

    return formatAchievementResponse(record);
  }

  /**
   * Delete / Soft-delete an award or achievement
   */
  async deleteAchievement(
    id: string
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
  async addPeriod(data: CreatePeriodDTO): Promise<PeriodResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(data.classId)) {
      throw new Error("Invalid class ID provided");
    }

    // Verify class existence
    const targetClass = await Class.findById(data.classId);
    if (!targetClass) {
      throw new Error("Target class not found");
    }

    // Check for duplicate period on the same day for this class
    const existing = await TimetablePeriod.findOne({
      classId: new mongoose.Types.ObjectId(data.classId),
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
      classId: new mongoose.Types.ObjectId(data.classId),
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
   * Get all active periods for a class or day
   */
  async getPeriods(filter?: {
    classId?: string | undefined;
    day?: MadrasaDay | undefined;
  }): Promise<PeriodResponseDTO[]> {
    const query: any = { isActive: true };

    if (filter?.classId && mongoose.Types.ObjectId.isValid(filter.classId)) {
      query.classId = new mongoose.Types.ObjectId(filter.classId);
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
  async getPeriodById(id: string): Promise<PeriodResponseDTO> {
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

    return formatPeriodResponse(period);
  }

  /**
   * Edit / Update a timetable period
   */
  async updatePeriod(
    id: string,
    data: UpdatePeriodDTO
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

    // Update target class if provided
    if (data.classId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(data.classId)) {
        throw new Error("Invalid class ID provided");
      }
      const targetClass = await Class.findById(data.classId);
      if (!targetClass) {
        throw new Error("Target class not found");
      }
      period.classId = new mongoose.Types.ObjectId(data.classId);
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
   * Delete / Soft-delete a timetable period
   */
  async deletePeriod(
    id: string
  ): Promise<{ success: boolean; message: string; deletedId: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid period ID");
    }

    const period = await TimetablePeriod.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true,
    });

    if (!period) {
      throw new Error("Timetable period not found or already deleted");
    }

    // Soft delete
    period.isActive = false;
    await period.save();

    return {
      success: true,
      message: `Period ${period.periodNumber} (${period.subject}) for ${period.day} deleted successfully`,
      deletedId: period._id.toString(),
    };
  }
}

export const muallimService = new MuallimService();




