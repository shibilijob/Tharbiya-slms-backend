import mongoose from "mongoose";
import HifzTarget, { type IHifzTarget } from "../../models/HifzTarget.js";
import HifzRecord, { type IHifzRecord } from "../../models/HifzRecord.js";
import Class from "../../models/Class.js";
import Student from "../../models/Student.js";
import AcademicYear from "../../models/AcademicYear.js";
import { muallimService } from "../muallim/muallim.service.js";
import { normalizeHifzStatus } from "./hifz.validators.js";
import type {
  CreateHifzTargetDTO,
  UpdateHifzTargetDTO,
  HifzTargetResponseDTO,
  CreateHifzRecordDTO,
  UpdateHifzRecordDTO,
  HifzRecordResponseDTO,
  StudentHifzSummary,
  HifzRangeDTO,
  HifzScheduleDTO,
} from "./hifz.types.js";

const normalizeSchedules = (
  schedules?: HifzScheduleDTO[],
  fallback?: { startDate?: string | Date; endDate?: string | Date; fromAyah?: number; toAyah?: number }
) => {
  const source =
    schedules && schedules.length > 0
      ? schedules
      : fallback?.startDate && fallback?.endDate && fallback?.fromAyah && fallback?.toAyah
      ? [
          {
            dateFrom: fallback.startDate,
            dateTo: fallback.endDate,
            ayahFrom: fallback.fromAyah,
            ayahTo: fallback.toAyah,
          },
        ]
      : [];

  return source.map((schedule) => ({
    dateFrom: new Date(schedule.dateFrom),
    dateTo: new Date(schedule.dateTo),
    ayahFrom: Number(schedule.ayahFrom),
    ayahTo: Number(schedule.ayahTo),
  }));
};

const formatSchedules = (target: any) => {
  const schedules = Array.isArray(target.schedules) ? target.schedules : [];
  const source =
    schedules.length > 0
      ? schedules
      : target.startDate && target.endDate && target.fromAyah && target.toAyah
      ? [
          {
            dateFrom: target.startDate,
            dateTo: target.endDate,
            ayahFrom: target.fromAyah,
            ayahTo: target.toAyah,
          },
        ]
      : [];

  return source.map((schedule: any) => ({
    dateFrom: schedule.dateFrom ? new Date(schedule.dateFrom).toISOString() : "",
    dateTo: schedule.dateTo ? new Date(schedule.dateTo).toISOString() : "",
    ayahFrom: Number(schedule.ayahFrom),
    ayahTo: Number(schedule.ayahTo),
  }));
};

const normalizeCompletedRanges = (
  ranges?: HifzRangeDTO[],
  ayahFrom?: number,
  ayahTo?: number,
  progress?: string
) => {
  const explicit = ranges && ranges.length > 0 ? ranges : [];
  const source =
    explicit.length > 0
      ? explicit
      : ayahFrom && ayahTo
      ? [{ ayahFrom, ayahTo }]
      : parseAyahRangesFromProgress(progress || "");

  return source.map((range) => ({
    ayahFrom: Number(range.ayahFrom),
    ayahTo: Number(range.ayahTo),
  }));
};

export const parseAyahRangesFromProgress = (progress: string): HifzRangeDTO[] => {
  const ranges: HifzRangeDTO[] = [];
  const regex = /(\d+)\s*(?:-|to|–|—)\s*(\d+)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(progress)) !== null) {
    const ayahFrom = Number(match[1]);
    const ayahTo = Number(match[2]);
    if (ayahFrom > 0 && ayahTo >= ayahFrom) {
      ranges.push({ ayahFrom, ayahTo });
    }
  }

  if (ranges.length === 0) {
    const single = progress.match(/\b(?:ayah|ayat|ayahs)?\s*(\d+)\b/i);
    if (single) {
      const ayah = Number(single[1]);
      if (ayah > 0) ranges.push({ ayahFrom: ayah, ayahTo: ayah });
    }
  }

  return ranges;
};

export const expandRangesToAyahs = (ranges: HifzRangeDTO[]): number[] => {
  const ayahs = new Set<number>();
  for (const range of ranges) {
    for (let ayah = range.ayahFrom; ayah <= range.ayahTo; ayah += 1) {
      ayahs.add(ayah);
    }
  }
  return Array.from(ayahs).sort((a, b) => a - b);
};

const formatHifzTargetResponse = (target: any): HifzTargetResponseDTO => ({
  id: target._id.toString(),
  classId: target.classId?._id ? target.classId._id.toString() : target.classId?.toString() || "",
  className: target.classId?.name || undefined,
  academicYearId: target.academicYearId?._id
    ? target.academicYearId._id.toString()
    : target.academicYearId?.toString() || "",
  academicYearName: target.academicYearId?.name || undefined,
  criteria: target.criteria,
  juzNumber: target.juzNumber || undefined,
  surahNumber: target.surahNumber || undefined,
  surahName: target.surahName || undefined,
  totalAyahsToMemorize: target.totalAyahsToMemorize || undefined,
  fromAyah: target.fromAyah || undefined,
  toAyah: target.toAyah || undefined,
  schedules: formatSchedules(target),
  startDate: target.startDate ? new Date(target.startDate).toISOString() : "",
  endDate: target.endDate ? new Date(target.endDate).toISOString() : "",
  status: target.status || (target.isActive !== false ? "ACTIVE" : "ARCHIVED"),
  isActive: target.isActive !== false,
  createdById: target.createdById?._id
    ? target.createdById._id.toString()
    : target.createdById?.toString() || "",
  createdByName: target.createdById?.name || undefined,
  createdAt: target.createdAt ? new Date(target.createdAt).toISOString() : "",
  updatedAt: target.updatedAt ? new Date(target.updatedAt).toISOString() : "",
});

const formatHifzRecordResponse = (record: any): HifzRecordResponseDTO => ({
  id: record._id.toString(),
  studentId: record.studentId?._id
    ? record.studentId._id.toString()
    : record.studentId?.toString() || "",
  studentName: record.studentId?.name || undefined,
  admissionNumber: record.studentId?.admissionNumber || undefined,
  classId: record.classId?._id
    ? record.classId._id.toString()
    : record.classId?.toString() || "",
  className: record.classId?.name || undefined,
  hifzTargetId: record.hifzTargetId?._id
    ? record.hifzTargetId._id.toString()
    : record.hifzTargetId?.toString() || "",
  targetCriteria: record.hifzTargetId?.criteria || undefined,
  date: record.date ? new Date(record.date).toISOString() : "",
  progress: record.progress,
  completedAyahFrom: record.completedAyahFrom || undefined,
  completedAyahTo: record.completedAyahTo || undefined,
  completedRanges: normalizeCompletedRanges(
    record.completedRanges,
    record.completedAyahFrom,
    record.completedAyahTo,
    record.progress
  ),
  status: record.status || "COMPLETED",
  remark: record.remark || undefined,
  recordedById: record.recordedBy?._id
    ? record.recordedBy._id.toString()
    : record.recordedBy?.toString() || "",
  recordedByName: record.recordedBy?.name || undefined,
  createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : "",
  updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : "",
});

export class HifzService {
  /**
   * Helper: Resolve classId to ObjectId
   */
  private async resolveClassObjectId(classId: string): Promise<mongoose.Types.ObjectId> {
    if (mongoose.Types.ObjectId.isValid(classId)) {
      const cls = await Class.findById(classId);
      if (cls) return cls._id as mongoose.Types.ObjectId;
    }

    const cleanNum = classId.replace(/^Class\s*/i, "").trim();
    const cls = await Class.findOne({
      name: { $regex: new RegExp(`^Class\\s*${cleanNum}$|^${cleanNum}$`, "i") },
      isActive: true,
    });

    if (cls) return cls._id as mongoose.Types.ObjectId;
    throw new Error(`Class "${classId}" not found`);
  }

  /**
   * Helper: Get current active AcademicYear
   */
  private async getOrCreateCurrentAcademicYear(): Promise<mongoose.Types.ObjectId> {
    let year = await AcademicYear.findOne({ isCurrent: true, isActive: true });
    if (!year) {
      year = await AcademicYear.findOne({ isActive: true });
    }
    if (!year) {
      year = await AcademicYear.create({
        name: "2026-2027",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
        isActive: true,
      });
    }
    return year._id as mongoose.Types.ObjectId;
  }

  // =========================================================================
  // 1. HIFZ TARGET MANAGEMENT
  // =========================================================================

  /**
   * Create a Hifz Target for a Class
   */
  async createTarget(
    data: CreateHifzTargetDTO,
    teacherId: string
  ): Promise<HifzTargetResponseDTO> {
    const classObjectId = await this.resolveClassObjectId(data.classId);

    // Verify teacher assignment authorization
    const context = await muallimService.getTeacherContext(teacherId);
    const isAllowed = muallimService.isClassAssignedToTeacher(
      classObjectId,
      context.assignedClassIds,
      context.assignedClassNames
    );
    if (!isAllowed) {
      throw new Error("Access denied: You are not assigned to manage Hifz targets for this class");
    }

    // Resolve academic year
    let academicYearId: mongoose.Types.ObjectId;
    if (data.academicYearId && mongoose.Types.ObjectId.isValid(data.academicYearId)) {
      academicYearId = new mongoose.Types.ObjectId(data.academicYearId);
    } else {
      academicYearId = await this.getOrCreateCurrentAcademicYear();
    }

    const newTarget = await HifzTarget.create({
      classId: classObjectId,
      academicYearId,
      criteria: data.criteria.trim(),
      juzNumber: data.juzNumber,
      surahNumber: data.surahNumber,
      surahName: data.surahName?.trim(),
      totalAyahsToMemorize: data.totalAyahsToMemorize,
      fromAyah: data.fromAyah,
      toAyah: data.toAyah,
      schedules: normalizeSchedules(data.schedules, data),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: data.status || "ACTIVE",
      isActive: data.isActive !== false,
      createdById: new mongoose.Types.ObjectId(teacherId),
    });

    const populated = await HifzTarget.findById(newTarget._id)
      .populate("classId", "name")
      .populate("academicYearId", "name")
      .populate("createdById", "name");

    return formatHifzTargetResponse(populated);
  }

  /**
   * Get Hifz Targets with filtering scoped to teacher's assigned classes
   * Returns ALL active targets for that class (multiple targets supported)
   */
  async getTargets(
    filters: { classId?: string; academicYearId?: string; status?: string; isActive?: boolean } = {},
    teacherId: string
  ): Promise<HifzTargetResponseDTO[]> {
    const context = await muallimService.getTeacherContext(teacherId);

    const query: any = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    } else {
      query.isActive = true;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.academicYearId && mongoose.Types.ObjectId.isValid(filters.academicYearId)) {
      query.academicYearId = new mongoose.Types.ObjectId(filters.academicYearId);
    }

    if (filters.classId) {
      const isAllowed = muallimService.isClassAssignedToTeacher(
        filters.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        return [];
      }
      const classObjectId = await this.resolveClassObjectId(filters.classId);
      query.classId = classObjectId;
    } else {
      if (context.assignedClassIds.length === 0) {
        return [];
      }
      query.classId = { $in: context.assignedClassIds };
    }

    const targets = await HifzTarget.find(query)
      .populate("classId", "name")
      .populate("academicYearId", "name")
      .populate("createdById", "name")
      .sort({ createdAt: -1 });

    return targets.map(formatHifzTargetResponse);
  }

  /**
   * Get current active target for a class
   */
  async getActiveTargetForClass(
    classId: string,
    teacherId: string
  ): Promise<HifzTargetResponseDTO | null> {
    const context = await muallimService.getTeacherContext(teacherId);
    const isAllowed = muallimService.isClassAssignedToTeacher(
      classId,
      context.assignedClassIds,
      context.assignedClassNames
    );
    if (!isAllowed) {
      return null;
    }

    const classObjectId = await this.resolveClassObjectId(classId);

    const target = await HifzTarget.findOne({
      classId: classObjectId,
      isActive: true,
    })
      .populate("classId", "name")
      .populate("academicYearId", "name")
      .populate("createdById", "name")
      .sort({ createdAt: -1, endDate: -1 });

    if (!target) return null;
    return formatHifzTargetResponse(target);
  }

  /**
   * Get single Hifz Target by ID
   */
  async getTargetById(targetId: string, teacherId: string): Promise<HifzTargetResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw new Error("Invalid Hifz Target ID");
    }

    const target = await HifzTarget.findById(targetId)
      .populate("classId", "name")
      .populate("academicYearId", "name")
      .populate("createdById", "name");

    if (!target) {
      throw new Error("Hifz target not found");
    }

    const context = await muallimService.getTeacherContext(teacherId);
    const isAllowed = muallimService.isClassAssignedToTeacher(
      target.classId?._id || target.classId,
      context.assignedClassIds,
      context.assignedClassNames
    );
    if (!isAllowed) {
      throw new Error("Access denied: You are not authorized to view this target");
    }

    return formatHifzTargetResponse(target);
  }

  /**
   * Update an existing Hifz Target
   */
  async updateTarget(
    targetId: string,
    data: UpdateHifzTargetDTO,
    teacherId: string
  ): Promise<HifzTargetResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw new Error("Invalid Hifz Target ID");
    }

    const target = await HifzTarget.findById(targetId);
    if (!target) {
      throw new Error("Hifz target not found");
    }

    const context = await muallimService.getTeacherContext(teacherId);
    const isAllowed = muallimService.isClassAssignedToTeacher(
      target.classId,
      context.assignedClassIds,
      context.assignedClassNames
    );
    if (!isAllowed) {
      throw new Error("Access denied: You are not authorized to edit this target");
    }

    if (data.criteria !== undefined) target.criteria = data.criteria.trim();
    if (data.juzNumber !== undefined) target.juzNumber = data.juzNumber;
    if (data.surahNumber !== undefined) target.surahNumber = data.surahNumber;
    if (data.surahName !== undefined) target.surahName = data.surahName.trim();
    if (data.totalAyahsToMemorize !== undefined) target.totalAyahsToMemorize = data.totalAyahsToMemorize;
    if (data.fromAyah !== undefined) target.fromAyah = data.fromAyah;
    if (data.toAyah !== undefined) target.toAyah = data.toAyah;
    if (data.schedules !== undefined) target.schedules = normalizeSchedules(data.schedules) as any;
    if (data.startDate !== undefined) target.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) target.endDate = new Date(data.endDate);
    if (data.status !== undefined) target.status = data.status;
    if (data.isActive !== undefined) target.isActive = data.isActive;

    await target.save();

    const populated = await HifzTarget.findById(target._id)
      .populate("classId", "name")
      .populate("academicYearId", "name")
      .populate("createdById", "name");

    return formatHifzTargetResponse(populated);
  }

  /**
   * Delete or archive a Hifz Target
   * Safely soft-archives if student progress records reference it, preserving history
   */
  async deleteTarget(targetId: string, teacherId: string): Promise<{ message: string }> {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw new Error("Invalid Hifz Target ID");
    }

    const target = await HifzTarget.findById(targetId);
    if (!target) {
      throw new Error("Hifz target not found");
    }

    const context = await muallimService.getTeacherContext(teacherId);
    const isAllowed = muallimService.isClassAssignedToTeacher(
      target.classId,
      context.assignedClassIds,
      context.assignedClassNames
    );
    if (!isAllowed) {
      throw new Error("Access denied: You are not authorized to delete this target");
    }

    // Safety check: check if Hifz progress records reference this target
    const recordCount = await HifzRecord.countDocuments({ hifzTargetId: target._id });
    if (recordCount > 0) {
      target.isActive = false;
      target.status = "ARCHIVED";
      await target.save();
      return { message: "Hifz target archived successfully (historical records preserved)" };
    } else {
      await HifzTarget.findByIdAndDelete(target._id);
      return { message: "Hifz target deleted successfully" };
    }
  }

  // =========================================================================
  // 2. HIFZ RECORD MANAGEMENT (STUDENT PERFORMANCE)
  // =========================================================================

  /**
   * Create a Hifz Record for a Student against a Class Target
   */
  async createRecord(
    data: CreateHifzRecordDTO,
    teacherId: string
  ): Promise<HifzRecordResponseDTO> {
    const classObjectId = await this.resolveClassObjectId(data.classId);

    // 1. Verify teacher assignment
    const context = await muallimService.getTeacherContext(teacherId);
    const isAllowed = muallimService.isClassAssignedToTeacher(
      classObjectId,
      context.assignedClassIds,
      context.assignedClassNames
    );
    if (!isAllowed) {
      throw new Error("Access denied: You are not assigned to manage records for this class");
    }

    // 2. Verify Target exists and belongs to the specified class
    const target = await HifzTarget.findById(data.hifzTargetId);
    if (!target) {
      throw new Error("Hifz target not found");
    }
    if (target.classId.toString() !== classObjectId.toString()) {
      throw new Error("Hifz target does not belong to the specified class");
    }

    // 3. Verify Student exists, is active, and belongs to the specified class
    const student = await Student.findById(data.studentId);
    if (!student || !student.isActive) {
      throw new Error("Student not found or is inactive");
    }
    if (student.classId.toString() !== classObjectId.toString()) {
      throw new Error("Student is not enrolled in the specified class");
    }

    const recordDate = data.date ? new Date(data.date) : new Date();
    const status = normalizeHifzStatus(data.status);
    const completedRanges = normalizeCompletedRanges(
      data.completedRanges,
      data.completedAyahFrom,
      data.completedAyahTo,
      data.progress
    );

    // Upsert record if one already exists for the same target + student + date
    const existing = await HifzRecord.findOne({
      studentId: student._id,
      hifzTargetId: target._id,
    });

    let savedRecord: IHifzRecord;
    if (existing) {
      existing.progress = data.progress.trim();
      existing.completedAyahFrom = completedRanges[0]?.ayahFrom;
      existing.completedAyahTo = completedRanges[0]?.ayahTo;
      existing.completedRanges = completedRanges as any;
      existing.status = status;
      existing.remark = data.remark?.trim() || "";
      existing.date = recordDate;
      existing.recordedBy = new mongoose.Types.ObjectId(teacherId);
      savedRecord = await existing.save();
    } else {
      savedRecord = await HifzRecord.create({
        studentId: student._id,
        classId: classObjectId,
        hifzTargetId: target._id,
        date: recordDate,
        progress: data.progress.trim(),
        completedAyahFrom: completedRanges[0]?.ayahFrom,
        completedAyahTo: completedRanges[0]?.ayahTo,
        completedRanges,
        status,
        remark: data.remark?.trim() || "",
        recordedBy: new mongoose.Types.ObjectId(teacherId),
      });
    }

    const populated = await HifzRecord.findById(savedRecord._id)
      .populate("studentId", "name admissionNumber")
      .populate("classId", "name")
      .populate("hifzTargetId", "criteria")
      .populate("recordedBy", "name");

    return formatHifzRecordResponse(populated);
  }

  /**
   * Get Hifz Records with filtering
   */
  async getRecords(
    filters: { targetId?: string; classId?: string; studentId?: string; date?: string } = {},
    teacherId: string
  ): Promise<HifzRecordResponseDTO[]> {
    const context = await muallimService.getTeacherContext(teacherId);

    const query: any = {};

    if (filters.classId) {
      const isAllowed = muallimService.isClassAssignedToTeacher(
        filters.classId,
        context.assignedClassIds,
        context.assignedClassNames
      );
      if (!isAllowed) {
        return [];
      }
      const classObjectId = await this.resolveClassObjectId(filters.classId);
      query.classId = classObjectId;
    } else {
      if (context.assignedClassIds.length === 0) {
        return [];
      }
      query.classId = { $in: context.assignedClassIds };
    }

    if (filters.targetId && mongoose.Types.ObjectId.isValid(filters.targetId)) {
      query.hifzTargetId = new mongoose.Types.ObjectId(filters.targetId);
    }

    if (filters.studentId && mongoose.Types.ObjectId.isValid(filters.studentId)) {
      query.studentId = new mongoose.Types.ObjectId(filters.studentId);
    }

    if (filters.date) {
      const d = new Date(filters.date);
      const startOfDay = new Date(d);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const records = await HifzRecord.find(query)
      .populate("studentId", "name admissionNumber")
      .populate("classId", "name")
      .populate("hifzTargetId", "criteria")
      .populate("recordedBy", "name")
      .sort({ date: -1, createdAt: -1 });

    return records.map(formatHifzRecordResponse);
  }

  /**
   * Get single Hifz Record by ID
   */
  async getRecordById(recordId: string, teacherId: string): Promise<HifzRecordResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw new Error("Invalid Hifz Record ID");
    }

    const record = await HifzRecord.findById(recordId)
      .populate("studentId", "name admissionNumber")
      .populate("classId", "name")
      .populate("hifzTargetId", "criteria")
      .populate("recordedBy", "name");

    if (!record) {
      throw new Error("Hifz record not found");
    }

    const context = await muallimService.getTeacherContext(teacherId);
    const isAllowed = muallimService.isClassAssignedToTeacher(
      record.classId?._id || record.classId,
      context.assignedClassIds,
      context.assignedClassNames
    );
    if (!isAllowed) {
      throw new Error("Access denied: You are not authorized to view this record");
    }

    return formatHifzRecordResponse(record);
  }

  /**
   * Update an existing Hifz Record
   */
  async updateRecord(
    recordId: string,
    data: UpdateHifzRecordDTO,
    teacherId: string
  ): Promise<HifzRecordResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw new Error("Invalid Hifz Record ID");
    }

    const record = await HifzRecord.findById(recordId);
    if (!record) {
      throw new Error("Hifz record not found");
    }

    const context = await muallimService.getTeacherContext(teacherId);
    const isAllowed = muallimService.isClassAssignedToTeacher(
      record.classId,
      context.assignedClassIds,
      context.assignedClassNames
    );
    if (!isAllowed) {
      throw new Error("Access denied: You are not authorized to edit this record");
    }

    if (data.progress !== undefined) record.progress = data.progress.trim();
    if (
      data.completedRanges !== undefined ||
      data.completedAyahFrom !== undefined ||
      data.completedAyahTo !== undefined ||
      data.progress !== undefined
    ) {
      const completedRanges = normalizeCompletedRanges(
        data.completedRanges,
        data.completedAyahFrom,
        data.completedAyahTo,
        data.progress ?? record.progress
      );
      record.completedAyahFrom = completedRanges[0]?.ayahFrom;
      record.completedAyahTo = completedRanges[0]?.ayahTo;
      record.completedRanges = completedRanges as any;
    }
    if (data.status !== undefined) record.status = normalizeHifzStatus(data.status);
    if (data.remark !== undefined) record.remark = data.remark.trim();
    if (data.date !== undefined) record.date = new Date(data.date);
    record.recordedBy = new mongoose.Types.ObjectId(teacherId);

    await record.save();

    const populated = await HifzRecord.findById(record._id)
      .populate("studentId", "name admissionNumber")
      .populate("classId", "name")
      .populate("hifzTargetId", "criteria")
      .populate("recordedBy", "name");

    return formatHifzRecordResponse(populated);
  }

  /**
   * Delete a Hifz Record
   */
  async deleteRecord(recordId: string, teacherId: string): Promise<{ message: string }> {
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw new Error("Invalid Hifz Record ID");
    }

    const record = await HifzRecord.findById(recordId);
    if (!record) {
      throw new Error("Hifz record not found");
    }

    const context = await muallimService.getTeacherContext(teacherId);
    const isAllowed = muallimService.isClassAssignedToTeacher(
      record.classId,
      context.assignedClassIds,
      context.assignedClassNames
    );
    if (!isAllowed) {
      throw new Error("Access denied: You are not authorized to delete this record");
    }

    await HifzRecord.findByIdAndDelete(record._id);
    return { message: "Hifz record deleted successfully" };
  }

  // =========================================================================
  // 3. STUDENT SUMMARY & PARENT COMPATIBILITY
  // =========================================================================

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
}

export const hifzService = new HifzService();
