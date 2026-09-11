import User from "../../models/User.js";
import Student from "../../models/Student.js";
import Class from "../../models/Class.js";
import AcademicYear from "../../models/AcademicYear.js";
import Attendance from "../../models/Attendance.js";
import HifzRecord from "../../models/HifzRecord.js";
import DeletedStudent from "../../models/DeletedStudent.js";
import DeletedUser from "../../models/DeletedUser.js";
import PracticalEvaluation from "../practical/practical.model.js";
import { auth } from "../auth/auth.js";
import { Types } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import {
  generateActiveStudentsPdf,
  generateParentDetailsPdf,
} from "../../utils/exportPdf.js";
import type {
  MadrasaOverviewStats,
  CreateAnnouncementDTO,
  CreateStudentDTO,
  UpdateStudentDTO,
  CreateMuallimDTO,
  UpdateMuallimDTO,
  MuallimResponseDTO,
  CreateParentDTO,
  UpdateParentDTO,
  ParentResponseDTO,
  CreateClassDTO,
  UpdateClassDTO,
  ClassResponseDTO,
  PaginationQueryDTO,
  PaginatedStudentResultDTO,
} from "./sadhr.types.js";

const formatMuallimResponse = (user: any, assignedClassesOverride?: string[]): MuallimResponseDTO => ({
  id: user._id.toString(),
  name: user.name,
  phone: user.phone,
  email: user.email || undefined,
  role: user.role,
  designation: user.designation || "Usthad & Class Mentor",
  assignedClasses: assignedClassesOverride ?? user.assignedClasses ?? [],
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const formatParentResponse = (user: any, children: any[] = []): ParentResponseDTO => ({
  id: user._id.toString(),
  name: user.name,
  phone: user.phone,
  email: user.email || undefined,
  password: user.password || undefined,
  role: "PARENT",
  studentIds: children.map((c) => c._id?.toString() || c.id?.toString()),
  children: children.map((c) => ({
    id: c._id?.toString() || c.id?.toString(),
    name: c.name,
    admissionNumber: c.admissionNumber,
    className: c.classId?.name || "Class",
    classDivision: c.classId?.division || undefined,
  })),
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const formatClassResponse = (cls: any, studentCount: number = 0): ClassResponseDTO => {
  const teacher = cls.classTeacherId;
  const teacherName = teacher ? (typeof teacher === "object" ? teacher.name : undefined) : undefined;
  const teacherPhone = teacher ? (typeof teacher === "object" ? teacher.phone : undefined) : undefined;

  return {
    id: cls._id.toString(),
    name: cls.name,
    division: cls.division || "A",
    classTeacherId: teacher ? (typeof teacher === "object" ? teacher._id?.toString() : teacher.toString()) : undefined,
    classTeacherName: teacherName || "Unassigned",
    classTeacherPhone: teacherPhone,
    studentCount,
    averageProgress: 88,
    capacity: cls.capacity || 30,
    isActive: cls.isActive ?? true,
    createdAt: cls.createdAt || new Date(),
    updatedAt: cls.updatedAt || new Date(),
  };
};

const PARENT_PASSWORD_REGEX = /^dnm\d{4}$/;

const generateParentInitialPassword = (): string => {
  const digits = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  const password = `dnm${digits}`;

  if (!PARENT_PASSWORD_REGEX.test(password)) {
    throw new Error("Generated parent password does not match the required format");
  }

  return password;
};

const getClassSortNumber = (classDoc: any): number => {
  const className = String(classDoc?.name || "");
  const numericPart = className.match(/\d+/)?.[0];
  return numericPart ? Number(numericPart) : Number.MAX_SAFE_INTEGER;
};

const getClassDisplayName = (classDoc: any): string => {
  if (!classDoc?.name) {
    return "";
  }

  return `${classDoc.name}${classDoc.division ? ` ${classDoc.division}` : ""}`;
};

const getClassAssignmentValue = (classDoc: any): string => {
  return String(classDoc?.name || "").replace(/^Class\s*/i, "").trim();
};

export class SadhrService {
  private async resolveActiveAssignedClasses(assignedClasses: string[] = []) {
    const uniqueValues = Array.from(
      new Set(assignedClasses.map((cls) => String(cls || "").trim()).filter(Boolean))
    );

    const classDocs = [];
    for (const value of uniqueValues) {
      let classDoc: any = null;

      if (Types.ObjectId.isValid(value)) {
        classDoc = await Class.findOne({ _id: new Types.ObjectId(value), isActive: true });
      }

      if (!classDoc) {
        const cleanClass = value.replace(/^Class\s*/i, "").trim();
        classDoc = await Class.findOne({
          name: { $regex: new RegExp(`^Class\\s*${cleanClass}$|^${cleanClass}$`, "i") },
          isActive: true,
        });
      }

      if (!classDoc) {
        throw new Error(`Class "${value}" not found or inactive`);
      }

      classDocs.push(classDoc);
    }

    return classDocs;
  }

  private async claimClassesForMuallim(muallimId: Types.ObjectId, assignedClasses: string[] = []) {
    const classDocs = await this.resolveActiveAssignedClasses(assignedClasses);
    const requestedClassIds = classDocs.map((classDoc: any) => classDoc._id as Types.ObjectId);

    for (const classDoc of classDocs) {
      const currentTeacherId = classDoc.classTeacherId?.toString();
      if (currentTeacherId && currentTeacherId !== muallimId.toString()) {
        throw new Error("This class is already assigned to another Muallim.");
      }
    }

    for (const classDoc of classDocs) {
      const claimed = await Class.findOneAndUpdate(
        {
          _id: classDoc._id,
          isActive: true,
          $or: [
            { classTeacherId: { $exists: false } },
            { classTeacherId: null },
            { classTeacherId: muallimId },
          ],
        },
        { $set: { classTeacherId: muallimId } },
        { new: true }
      );

      if (!claimed) {
        throw new Error("This class is already assigned to another Muallim.");
      }
    }

    await Class.updateMany(
      {
        classTeacherId: muallimId,
        ...(requestedClassIds.length > 0 ? { _id: { $nin: requestedClassIds } } : {}),
      },
      { $unset: { classTeacherId: 1 } }
    );

    return classDocs.map((classDoc: any) => getClassAssignmentValue(classDoc));
  }

  /**
   * Aggregate high-level executive statistics for Sadhr Muallim
   */
  async getExecutiveStats(): Promise<MadrasaOverviewStats> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [totalStudents, totalTeachers, totalClasses, todayAttendance, activeHifzStudentIds, practicalAverage] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ["MUALLIM", "SADHR_MUALLIM"] }, isActive: true }),
      Class.countDocuments({ isActive: true }),
      Attendance.find({ date: today }).select("status"),
      HifzRecord.distinct("studentId"),
      PracticalEvaluation.aggregate([
        { $group: { _id: null, averageScore: { $avg: "$overallScore" } } },
      ]),
    ]);

    const countedAttendance = todayAttendance.filter((record) => record.status !== "HOLIDAY");
    const presentAttendance = countedAttendance.filter((record) => record.status === "PRESENT").length;
    const averageAttendanceToday = countedAttendance.length > 0
      ? Number(((presentAttendance / countedAttendance.length) * 100).toFixed(1))
      : 0;

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      averageAttendanceToday,
      activeHifzStudents: activeHifzStudentIds.length,
      monthlyAveragePracticalScore: Number((practicalAverage[0]?.averageScore || 0).toFixed(1)),
    };
  }

  /**
   * Get all classes and their assigned Usthad
   */
  async getAllClassesWithTeachers(): Promise<ClassResponseDTO[]> {
    if (!Class) return [];

    const classes = await Class.find({ isActive: true })
      .populate("classTeacherId", "name phone email role designation");

    // Natural sort: Class 1, Class 2 ... Class 10
    classes.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );

    const results: ClassResponseDTO[] = [];
    for (const c of classes) {
      const studentCount = await Student.countDocuments({ classId: c._id, isActive: true });
      results.push(formatClassResponse(c, studentCount));
    }
    return results;
  }

  /**
   * Broadcast announcement (simulated or stored)
   */
  async createAnnouncement(data: CreateAnnouncementDTO, createdById: string) {
    return {
      id: "announcement-" + Date.now(),
      title: data.title,
      message: data.message,
      targetAudience: data.targetAudience,
      priority: data.priority || "NORMAL",
      createdById,
      createdAt: new Date(),
    };
  }

  /**
   * Helper to ensure an active academic year exists
   */
  async getOrCreateCurrentAcademicYear() {
    let year = await AcademicYear.findOne({ isCurrent: true, isActive: true });
    if (!year) {
      year = await AcademicYear.findOne({ isActive: true });
    }
    if (!year) {
      year = await AcademicYear.create({
        name: "2025-2026",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2026-03-31"),
        isCurrent: true,
        isActive: true,
      });
    }
    return year;
  }

  // create student
  async createStudent(data: any) {
    const cleanAdmNo = String(data.admissionNumber || data.admissionNo || "").trim();

    if (!cleanAdmNo) {
      throw new Error("Admission number is required");
    }

    const existingStudent = await Student.findOne({
      admissionNumber: cleanAdmNo,
      isActive: true,
    });

    if (existingStudent) {
      throw new Error(
        `Student with admission number "${cleanAdmNo}" already exists`
      );
    }

    // 1. Resolve Academic Year
    let yearId: Types.ObjectId;
    if (data.academicYearId && Types.ObjectId.isValid(data.academicYearId)) {
      yearId = new Types.ObjectId(data.academicYearId);
    } else {
      const year = await this.getOrCreateCurrentAcademicYear();
      yearId = year._id as Types.ObjectId;
    }

    // 2. Resolve Class ID
    let classIdObj: Types.ObjectId;
    const rawClass = String(data.classId || data.class || "").trim();
    if (!rawClass) {
      throw new Error("Class is required");
    }
    if (Types.ObjectId.isValid(rawClass)) {
      const targetClass = await Class.findOne({ _id: rawClass, isActive: true });
      if (!targetClass) {
        throw new Error("Class not found or inactive");
      }
      classIdObj = targetClass._id as Types.ObjectId;
    } else {
      const cleanClsName = rawClass.replace(/^Class\s*/i, "").trim();
      const targetClass = await Class.findOne({
        name: { $regex: new RegExp(`^Class\\s*${cleanClsName}$|^${cleanClsName}$`, "i") },
        isActive: true,
      });
      if (!targetClass) {
        throw new Error(`Class "${rawClass}" not found`);
      }
      classIdObj = targetClass._id as Types.ObjectId;
    }

    // 3. Resolve Parent ID
    let parentIdObj: Types.ObjectId;
    const rawParent = String(data.parentId || "").trim();
    if (Types.ObjectId.isValid(rawParent)) {
      const parent = await User.findOne({
        _id: rawParent,
        role: "PARENT",
        isActive: true,
      });
      if (!parent) {
        throw new Error("Parent not found or inactive");
      }
      parentIdObj = parent._id as Types.ObjectId;
    } else {
      throw new Error("A valid parent is required");
    }

    const studentPayload: any = {
      name: data.name.trim(),
      admissionNumber: cleanAdmNo,
      gender: data.gender || "MALE",
      parentId: parentIdObj,
      classId: classIdObj,
      academicYearId: yearId,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
      isActive: true,
    };

    if (data.dateOfBirth || data.dob) {
      studentPayload.dateOfBirth = new Date(data.dateOfBirth || data.dob);
    }

    if (data.address?.trim()) {
      studentPayload.address = data.address.trim();
    }

    const student = await Student.create(studentPayload);

    await student.populate([
      { path: "parentId", select: "name phone email" },
      { path: "classId", select: "name division classTeacherId", populate: { path: "classTeacherId", select: "name phone" } },
      { path: "academicYearId", select: "name startDate endDate" },
    ]);

    return student;
  }

  /**
   * Get paginated students with parent, class and academic year details (default limit: 20)
   */
  async getAllStudents(
    query?: PaginationQueryDTO
  ): Promise<PaginatedStudentResultDTO> {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query?.status === "INACTIVE") {
      filter.isActive = false;
    } else if (query?.status === "ACTIVE") {
      filter.isActive = true;
    }

    if (query?.classId && Types.ObjectId.isValid(query.classId)) {
      filter.classId = new Types.ObjectId(query.classId);
    }

    if (query?.search && typeof query.search === "string" && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { admissionNumber: searchRegex },
        { address: searchRegex },
      ];
    }

    const total = await Student.countDocuments(filter);

    const students = await Student.find(filter)
      .populate("parentId", "name phone email")
      .populate({
        path: "classId",
        select: "name division classTeacherId",
        populate: { path: "classTeacherId", select: "name phone designation" },
      })
      .populate("academicYearId", "name startDate endDate")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      students,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  /**
   * Update student details
   */
  async updateStudent(studentId: string, data: any) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new Error("Invalid student ID");
    }

    const student = await Student.findById(studentId);

    if (!student) {
      throw new Error("Student not found");
    }

    // Admission number
    if (data.admissionNumber !== undefined || data.admissionNo !== undefined) {
      const newAdm = String(data.admissionNumber || data.admissionNo).trim();
      const existingStudent = await Student.findOne({
        admissionNumber: newAdm,
        _id: { $ne: studentId },
      });

      if (existingStudent) {
        throw new Error(
          "Student with this admission number already exists"
        );
      }

      student.admissionNumber = newAdm;
    }

    // Basic details
    if (data.name !== undefined) {
      student.name = data.name.trim();
    }

    if (data.nameMalayalam !== undefined || data.malayalamName !== undefined) {
      student.nameMalayalam = String(data.nameMalayalam || data.malayalamName || "").trim();
    }

    if (data.phone !== undefined || data.parentPhone !== undefined) {
      student.phone = String(data.phone || data.parentPhone || "").trim();
    }

    if (data.dateOfBirth !== undefined || data.dob !== undefined) {
      student.dateOfBirth = new Date(data.dateOfBirth || data.dob);
    }

    if (data.gender !== undefined) {
      student.gender = data.gender;
    }

    if (data.address !== undefined) {
      student.address = data.address;
    }

    // Active / Status
    if (data.isActive !== undefined) {
      student.isActive = Boolean(data.isActive);
    } else if (data.status !== undefined) {
      student.isActive = data.status === "ACTIVE";
    }

    // Parent
    if (data.parentId !== undefined) {
      const rawParent = String(data.parentId || "");
      if (Types.ObjectId.isValid(rawParent)) {
        const parent = await User.findOne({
          _id: rawParent,
          role: "PARENT",
          isActive: true,
        });
        if (!parent) {
          throw new Error("Parent not found or inactive");
        }
        student.parentId = parent._id as Types.ObjectId;
      } else if (rawParent.trim()) {
        throw new Error("Invalid parent ID");
      }
    }

    // Class
    if (data.classId !== undefined || data.class !== undefined) {
      const rawCls = String(data.classId || data.class || "");
      if (Types.ObjectId.isValid(rawCls)) {
        const targetCls = await Class.findOne({ _id: rawCls, isActive: true });
        if (!targetCls) {
          throw new Error("Class not found or inactive");
        }
        student.classId = targetCls._id as Types.ObjectId;
      } else if (rawCls) {
        const cleanCls = rawCls.replace(/^Class\s*/i, "").trim();
        const targetCls = await Class.findOne({
          name: { $regex: new RegExp(`^Class\\s*${cleanCls}$|^${cleanCls}$`, "i") },
          isActive: true,
        });
        if (!targetCls) {
          throw new Error(`Class "${rawCls}" not found`);
        }
        student.classId = targetCls._id as Types.ObjectId;
      }
    }

    // Academic year
    if (data.academicYearId !== undefined) {
      if (Types.ObjectId.isValid(data.academicYearId)) {
        student.academicYearId = new Types.ObjectId(data.academicYearId);
      }
    }

    // Admission date
    if (data.admissionDate !== undefined) {
      student.admissionDate = new Date(data.admissionDate);
    }

    // Ensure required fields before saving
    if (!student.academicYearId) {
      const year = await this.getOrCreateCurrentAcademicYear();
      student.academicYearId = year._id as Types.ObjectId;
    }

    if (!student.parentId) {
      throw new Error("Student must be linked to a valid parent");
    }

    await student.save();

    await student.populate([
      { path: "parentId", select: "name phone email" },
      { path: "classId", select: "name division classTeacherId", populate: { path: "classTeacherId", select: "name phone designation" } },
      { path: "academicYearId", select: "name startDate endDate" },
    ]);

    return student;
  }

  /**
   * Soft delete student and move a copy to DeletedStudent collection
   */
  async deleteStudent(
    studentId: string,
    deletedBy: string
  ) {
    const student = await Student.findOne({
      _id: studentId,
      isActive: true,
    });

    if (!student) {
      throw new Error("Student not found");
    }

    // Create archive
    const deletedStudent = await DeletedStudent.create({
      originalStudentId: student._id,

      admissionNumber: student.admissionNumber,
      name: student.name,
      gender: student.gender,

      parentId: student.parentId,
      classId: student.classId,
      academicYearId: student.academicYearId,

      admissionDate: student.admissionDate,

      isActive: false,

      deletedAt: new Date(),
      deletedBy,

      ...(student.dateOfBirth !== undefined && {
        dateOfBirth: student.dateOfBirth,
      }),

      ...(student.address !== undefined && {
        address: student.address,
      }),
    });

    // Soft delete original student
    student.isActive = false;

    await student.save();

    return deletedStudent;
  }

  /**
   * ==========================================
   * MUALLIM (TEACHER) MANAGEMENT FUNCTIONS
   * ==========================================
   */

  /**
   * Create a new Muallim (Teacher)
   */
  async createMuallim(data: CreateMuallimDTO): Promise<MuallimResponseDTO> {
    const cleanPhone = data.phone.trim();
    const cleanEmail = data.email && data.email.trim() ? data.email.trim().toLowerCase() : undefined;

    // 1. Check phone uniqueness
    const existingUserByPhone = await User.findOne({ phone: cleanPhone, isActive: true });
    if (existingUserByPhone) {
      throw new Error("A faculty member or user with this phone number already exists");
    }

    // 2. Check email uniqueness if email provided
    if (cleanEmail) {
      const existingUserByEmail = await User.findOne({ email: cleanEmail, isActive: true });
      if (existingUserByEmail) {
        throw new Error("A user with this email address already exists");
      }
    }

    const role = data.role || "MUALLIM";
    const password = data.password || "muallim123";
    const designation =
      data.designation ||
      (role === "SADHR_MUALLIM" ? "Sadhr Muallim (Sadhr Mudarris)" : "Usthad & Class Mentor");
    const requestedAssignedClasses = Array.isArray(data.assignedClasses) ? data.assignedClasses : [];
    await this.resolveActiveAssignedClasses(requestedAssignedClasses);

    // 3. Create in Mongoose User collection
    const user = await User.create({
      name: data.name.trim(),
      phone: cleanPhone,
      password,
      role,
      designation,
      assignedClasses: [],
      isActive: true,
      ...(cleanEmail ? { email: cleanEmail } : {}),
    });

    let assignedClasses: string[] = [];
    try {
      assignedClasses = await this.claimClassesForMuallim(user._id as Types.ObjectId, requestedAssignedClasses);
      user.assignedClasses = assignedClasses;
      await user.save();
    } catch (err) {
      await User.findByIdAndDelete(user._id);
      throw err;
    }

    // 4. Hook registration with Better Auth
    try {
      await auth.api.signUpEmail({
        body: {
          email: cleanEmail || `muallim_${cleanPhone}@darunnajath.edu`,
          password,
          name: user.name,
          username: cleanPhone,
          role: role,
          phone: cleanPhone,
          designation,
          madrasaName: "Darunnajath Mundambra",
          assignedClasses: JSON.stringify(assignedClasses),
        },
      });
    } catch (err: any) {
      console.warn("Better Auth registration hook notice:", err?.message || err);
    }

    return formatMuallimResponse(user);
  }

  /**
   * Get all active Muallims (Teachers & Sadhr Muallims)
   */
  async getAllMuallims(): Promise<MuallimResponseDTO[]> {
    const teachers = await User.find({
      role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
      isActive: true,
    }).sort({ createdAt: -1 });

    const teacherIds = teachers.map((teacher) => teacher._id);
    const assignedClasses = await Class.find({
      classTeacherId: { $in: teacherIds },
      isActive: true,
    }).select("name classTeacherId");

    const classesByTeacher = new Map<string, string[]>();
    for (const classDoc of assignedClasses) {
      const teacherId = classDoc.classTeacherId?.toString();
      if (!teacherId) continue;
      const current = classesByTeacher.get(teacherId) || [];
      current.push(getClassAssignmentValue(classDoc));
      classesByTeacher.set(teacherId, current);
    }

    return teachers.map((t) => formatMuallimResponse(t, classesByTeacher.get(t._id.toString()) || []));
  }

  /**
   * Get single Muallim details by ID
   */
  async getMuallimById(muallimId: string): Promise<MuallimResponseDTO> {
    if (!Types.ObjectId.isValid(muallimId)) {
      throw new Error("Invalid Muallim ID");
    }

    const user = await User.findOne({
      _id: muallimId,
      role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
      isActive: true,
    });

    if (!user) {
      throw new Error("Muallim not found or inactive");
    }

    const assignedClasses = await Class.find({
      classTeacherId: user._id,
      isActive: true,
    }).select("name");

    return formatMuallimResponse(user, assignedClasses.map((classDoc) => getClassAssignmentValue(classDoc)));
  }

  /**
   * Update Muallim details
   */
  async updateMuallim(muallimId: string, data: UpdateMuallimDTO): Promise<MuallimResponseDTO> {
    if (!Types.ObjectId.isValid(muallimId)) {
      throw new Error("Invalid Muallim ID");
    }

    const user = await User.findOne({
      _id: muallimId,
      role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
      isActive: true,
    });

    if (!user) {
      throw new Error("Muallim not found or inactive");
    }

    // Phone uniqueness check
    if (data.phone !== undefined && data.phone.trim() !== user.phone) {
      const cleanPhone = data.phone.trim();
      const existingPhone = await User.findOne({
        phone: cleanPhone,
        _id: { $ne: muallimId },
        isActive: true,
      });

      if (existingPhone) {
        throw new Error("Another user with this phone number already exists");
      }
      user.phone = cleanPhone;
    }

    // Email uniqueness check
    if (data.email !== undefined) {
      const cleanEmail = data.email.trim().toLowerCase();
      if (cleanEmail && cleanEmail !== user.email) {
        const existingEmail = await User.findOne({
          email: cleanEmail,
          _id: { $ne: muallimId },
          isActive: true,
        });

        if (existingEmail) {
          throw new Error("Another user with this email address already exists");
        }
        user.email = cleanEmail;
      } else if (!cleanEmail) {
        user.set("email", undefined);
      }
    }

    // Basic fields
    if (data.name !== undefined) {
      user.name = data.name.trim();
    }

    if (data.password !== undefined && data.password.trim().length >= 5) {
      user.password = data.password.trim();
    }

    if (data.role !== undefined) {
      user.role = data.role;
    }

    if (data.designation !== undefined) {
      user.designation = data.designation.trim();
    }

    if (data.assignedClasses !== undefined) {
      user.assignedClasses = await this.claimClassesForMuallim(
        user._id as Types.ObjectId,
        Array.isArray(data.assignedClasses) ? data.assignedClasses : []
      );
    }

    if (data.isActive !== undefined) {
      user.isActive = data.isActive;
    }

    await user.save();

    return formatMuallimResponse(user);
  }

  /**
   * Soft delete Muallim and create archive record in DeletedUser collection
   */
  async deleteMuallim(muallimId: string, deletedBy: string, reason?: string) {
    if (!Types.ObjectId.isValid(muallimId)) {
      throw new Error("Invalid Muallim ID");
    }

    const user = await User.findOne({
      _id: muallimId,
      role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
      isActive: true,
    });

    if (!user) {
      throw new Error("Muallim not found or already deleted");
    }

    // 1. Create archive in DeletedUser
    const deletedRecord = await DeletedUser.create({
      originalUserId: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: false,
      deletedAt: new Date(),
      deletedBy,
      ...(user.email ? { email: user.email } : {}),
      ...(user.designation ? { designation: user.designation } : {}),
      ...(user.assignedClasses ? { assignedClasses: user.assignedClasses } : {}),
      reason: reason || "Removed from faculty roster by Sadhr Muallim",
    });

    // 2. Soft delete original user record
    user.isActive = false;
    user.deletedAt = new Date();
    user.deletedBy = typeof deletedBy === "string" ? deletedBy : String(deletedBy);
    await user.save();

    // 3. Clear any active Class teacher assignments
    if (Class) {
      try {
        await Class.updateMany(
          { classTeacherId: user._id },
          { $unset: { classTeacherId: 1 } }
        );
      } catch (err) {
        console.warn("Notice: Could not unassign deleted teacher from classes:", err);
      }
    }

    return {
      success: true,
      message: `Usthad ${user.name} removed and archived successfully`,
      archivedRecord: deletedRecord,
    };
  }

  /**
   * ==========================================
   * Parent Management Services
   * ==========================================
   */

  /**
   * Create and register a new Parent / Guardian account
   */
  async createParent(data: CreateParentDTO): Promise<ParentResponseDTO> {
    const cleanPhone = data.phone?.trim();
    const cleanEmail = data.email?.trim() ? data.email.trim().toLowerCase() : undefined;

    // 1. Check for duplicate phone or email
    const existing = await User.findOne({
      $or: [
        { phone: cleanPhone },
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ],
    });

    if (existing) {
      if (existing.phone === cleanPhone) {
        throw new Error(`A user account with phone number ${cleanPhone} already exists`);
      }
      if (cleanEmail && existing.email === cleanEmail) {
        throw new Error(`A user account with email ${cleanEmail} already exists`);
      }
    }

    const password = generateParentInitialPassword();

    // 2. Create in Mongoose User collection
    const user = await User.create({
      name: data.name.trim(),
      phone: cleanPhone,
      password,
      role: "PARENT",
      designation: "Parent / Guardian",
      isActive: true,
      ...(cleanEmail ? { email: cleanEmail } : {}),
    });

    // 3. Register in Better Auth
    try {
      await auth.api.signUpEmail({
        body: {
          email: cleanEmail || `parent_${cleanPhone}@darunnajath.edu`,
          password,
          name: user.name,
          username: cleanPhone,
          role: "PARENT",
          phone: cleanPhone,
          designation: "Parent / Guardian",
          madrasaName: "Darunnajath Mundambra",
          assignedClasses: "[]",
        },
      });
    } catch (err: any) {
      console.warn("Better Auth parent registration notice:", err?.message || err);
    }

    return formatParentResponse(user, []);
  }

  /**
   * Generate print-friendly parent credential cards from current active records.
   */
  async exportParentDetailsPdf(): Promise<Buffer> {
    const parents = await User.find({
      role: "PARENT",
      isActive: true,
    })
      .select("name phone password")
      .sort({ name: 1 });

    if (parents.length === 0) {
      throw new AppError("No active parent accounts found to export", 404);
    }

    return generateParentDetailsPdf(
      parents.map((parent) => ({
        name: parent.name,
        phone: parent.phone,
        password: parent.password,
      }))
    );
  }

  /**
   * Generate a print-friendly table of all active students and linked parents.
   */
  async exportActiveStudentsPdf(): Promise<Buffer> {
    const students = await Student.find({ isActive: true })
      .populate("parentId", "name phone")
      .populate("classId", "name division")
      .sort({ name: 1 });

    if (students.length === 0) {
      throw new AppError("No active students found to export", 404);
    }

    const sortedStudents = [...students].sort((a: any, b: any) => {
      const classDiff = getClassSortNumber(a.classId) - getClassSortNumber(b.classId);
      if (classDiff !== 0) {
        return classDiff;
      }

      const classNameDiff = getClassDisplayName(a.classId).localeCompare(
        getClassDisplayName(b.classId),
        undefined,
        { numeric: true, sensitivity: "base" }
      );
      if (classNameDiff !== 0) {
        return classNameDiff;
      }

      return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      });
    });

    return generateActiveStudentsPdf(
      sortedStudents.map((student: any) => {
        const classDoc = student.classId;
        const parent = student.parentId;

        return {
          registerNumber: student.admissionNumber,
          name: student.name,
          className: getClassDisplayName(classDoc),
          parentName: parent?.name || "",
          parentPhone: parent?.phone || "",
        };
      })
    );
  }

  /**
   * Get all registered parents with their linked children
   */
  async getAllParents(): Promise<ParentResponseDTO[]> {
    const parents = await User.find({
      role: "PARENT",
      isActive: true,
    }).sort({ createdAt: -1 });

    const parentIds = parents.map((p) => p._id);
    const students = await Student.find({
      parentId: { $in: parentIds },
      isActive: true,
    }).populate("classId", "name division");

    const childrenByParent = new Map<string, any[]>();
    for (const s of students) {
      const pid = (s as any).parentId?.toString();
      if (pid) {
        if (!childrenByParent.has(pid)) {
          childrenByParent.set(pid, []);
        }
        childrenByParent.get(pid)!.push(s);
      }
    }

    return parents.map((p) => formatParentResponse(p, childrenByParent.get(p._id.toString()) || []));
  }

  /**
   * Get single Parent details by ID
   */
  async getParentById(parentId: string): Promise<ParentResponseDTO> {
    if (!Types.ObjectId.isValid(parentId)) {
      throw new Error("Invalid Parent ID");
    }

    const user = await User.findOne({
      _id: parentId,
      role: "PARENT",
      isActive: true,
    });

    if (!user) {
      throw new Error("Parent not found or inactive");
    }

    const children = await Student.find({
      parentId: user._id,
      isActive: true,
    }).populate("classId", "name division");

    return formatParentResponse(user, children);
  }

  /**
   * Update Parent details
   */
  async updateParent(parentId: string, data: UpdateParentDTO): Promise<ParentResponseDTO> {
    if (!Types.ObjectId.isValid(parentId)) {
      throw new Error("Invalid Parent ID");
    }

    const user = await User.findOne({
      _id: parentId,
      role: "PARENT",
      isActive: true,
    });

    if (!user) {
      throw new Error("Parent not found or inactive");
    }

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.phone !== undefined) user.phone = data.phone.trim();
    if (data.email !== undefined) user.email = data.email.trim() ? data.email.trim().toLowerCase() : undefined;
    if (data.password !== undefined && data.password.trim()) user.password = data.password.trim();
    if (data.isActive !== undefined) user.isActive = data.isActive;

    await user.save();

    const children = await Student.find({
      parentId: user._id,
      isActive: true,
    }).populate("classId", "name division");

    return formatParentResponse(user, children);
  }

  /**
   * Soft delete Parent and archive
   */
  async deleteParent(parentId: string, deletedBy: string, reason?: string) {
    if (!Types.ObjectId.isValid(parentId)) {
      throw new Error("Invalid Parent ID");
    }

    const user = await User.findOne({
      _id: parentId,
      role: "PARENT",
      isActive: true,
    });

    if (!user) {
      throw new Error("Parent not found or already deleted");
    }

    // 1. Create archive in DeletedUser
    const deletedRecord = await DeletedUser.create({
      originalUserId: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: false,
      deletedAt: new Date(),
      deletedBy,
      ...(user.email ? { email: user.email } : {}),
      reason: reason || "Removed from parent directory by Sadhr Muallim",
    });

    // 2. Soft delete original user record
    user.isActive = false;
    user.deletedAt = new Date();
    user.deletedBy = typeof deletedBy === "string" ? deletedBy : String(deletedBy);
    await user.save();

    return {
      success: true,
      message: `Parent ${user.name} removed and archived successfully`,
      archivedRecord: deletedRecord,
    };
  }

  /**
   * ==========================================
   * Class Management Services
   * ==========================================
   */

  /**
   * Create a new Class
   */
  async createClass(data: CreateClassDTO): Promise<ClassResponseDTO> {
    const cleanName = data.name.trim();
    const cleanDivision = data.division?.trim() || "A";

    const existing = await Class.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, "i") },
      isActive: true,
    });

    if (existing) {
      throw new Error(`Class "${cleanName}" already exists`);
    }

    let teacherObjId: Types.ObjectId | undefined;
    if (data.classTeacherId && Types.ObjectId.isValid(data.classTeacherId)) {
      teacherObjId = new Types.ObjectId(data.classTeacherId);
    }

    const newClass = await Class.create({
      name: cleanName,
      division: cleanDivision,
      ...(teacherObjId ? { classTeacherId: teacherObjId } : {}),
      ...(data.capacity ? { capacity: Number(data.capacity) } : {}),
      isActive: true,
    });

    // If teacher assigned, sync teacher's assignedClasses
    if (teacherObjId) {
      const teacher = await User.findById(teacherObjId);
      if (teacher) {
        const clsNumber = cleanName.replace(/^class\s*/i, "").trim();
        const currentAssigned = teacher.assignedClasses || [];
        if (clsNumber && !currentAssigned.includes(clsNumber)) {
          teacher.assignedClasses = [...currentAssigned, clsNumber];
          await teacher.save();
        }
      }
    }

    await newClass.populate("classTeacherId", "name phone email role designation");
    return formatClassResponse(newClass, 0);
  }

  /**
   * Get single Class details by ID
   */
  async getClassById(classId: string): Promise<ClassResponseDTO> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new Error("Invalid Class ID");
    }

    const classDoc = await Class.findOne({ _id: classId, isActive: true })
      .populate("classTeacherId", "name phone email role designation");

    if (!classDoc) {
      throw new Error("Class not found or inactive");
    }

    const studentCount = await Student.countDocuments({ classId: classDoc._id, isActive: true });
    return formatClassResponse(classDoc, studentCount);
  }

  /**
   * Update Class details
   */
  async updateClass(classId: string, data: UpdateClassDTO): Promise<ClassResponseDTO> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new Error("Invalid Class ID");
    }

    const classDoc = await Class.findOne({ _id: classId, isActive: true });
    if (!classDoc) {
      throw new Error("Class not found or inactive");
    }

    const prevTeacherId = classDoc.classTeacherId?.toString();
    const prevName = classDoc.name;

    if (data.name !== undefined) {
      classDoc.name = data.name.trim();
    }
    if (data.division !== undefined) {
      classDoc.division = data.division.trim();
    }
    if (data.capacity !== undefined) {
      classDoc.capacity = Number(data.capacity);
    }
    if (data.isActive !== undefined) {
      classDoc.isActive = data.isActive;
    }

    if (data.classTeacherId !== undefined) {
      if (data.classTeacherId && Types.ObjectId.isValid(data.classTeacherId)) {
        classDoc.classTeacherId = new Types.ObjectId(data.classTeacherId);
      } else {
        classDoc.set("classTeacherId", undefined);
      }
    }

    await classDoc.save();

    // Sync previous and new teacher assignments
    const newTeacherId = classDoc.classTeacherId?.toString();
    const clsNumber = classDoc.name.replace(/^class\s*/i, "").trim();

    if (prevTeacherId && prevTeacherId !== newTeacherId) {
      const prevTeacher = await User.findById(prevTeacherId);
      if (prevTeacher && prevTeacher.assignedClasses) {
        const prevClsNumber = prevName.replace(/^class\s*/i, "").trim();
        prevTeacher.assignedClasses = prevTeacher.assignedClasses.filter((c) => c !== prevClsNumber);
        await prevTeacher.save();
      }
    }

    if (newTeacherId) {
      const newTeacher = await User.findById(newTeacherId);
      if (newTeacher) {
        const currentAssigned = newTeacher.assignedClasses || [];
        if (clsNumber && !currentAssigned.includes(clsNumber)) {
          newTeacher.assignedClasses = [...currentAssigned, clsNumber];
          await newTeacher.save();
        }
      }
    }

    await classDoc.populate("classTeacherId", "name phone email role designation");
    const studentCount = await Student.countDocuments({ classId: classDoc._id, isActive: true });
    return formatClassResponse(classDoc, studentCount);
  }

  /**
   * Soft delete Class
   */
  async deleteClass(classId: string) {
    if (!Types.ObjectId.isValid(classId)) {
      throw new Error("Invalid Class ID");
    }

    const classDoc = await Class.findOne({ _id: classId, isActive: true });
    if (!classDoc) {
      throw new Error("Class not found or already deleted");
    }

    // Soft delete
    classDoc.isActive = false;
    await classDoc.save();

    // Remove from teacher assignedClasses
    if (classDoc.classTeacherId) {
      const teacher = await User.findById(classDoc.classTeacherId);
      if (teacher && teacher.assignedClasses) {
        const clsNumber = classDoc.name.replace(/^class\s*/i, "").trim();
        teacher.assignedClasses = teacher.assignedClasses.filter((c) => c !== clsNumber);
        await teacher.save();
      }
    }

    return {
      success: true,
      message: `Class "${classDoc.name}" deleted successfully`,
    };
  }
}

export const sadhrService = new SadhrService();
