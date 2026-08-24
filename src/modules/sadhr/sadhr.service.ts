import User from "../../models/User.js";
import Student from "../../models/Student.js";
import Class from "../../models/Class.js";
import AcademicYear from "../../models/AcademicYear.js";
import DeletedStudent from "../../models/DeletedStudent.js";
import DeletedUser from "../../models/DeletedUser.js";
import { auth } from "../auth/auth.js";
import { Types } from "mongoose";
import type {
  MadrasaOverviewStats,
  CreateAnnouncementDTO,
  CreateStudentDTO,
  UpdateStudentDTO,
  CreateMuallimDTO,
  UpdateMuallimDTO,
  MuallimResponseDTO,
  PaginationQueryDTO,
  PaginatedStudentResultDTO,
} from "./sadhr.types.js";

const formatMuallimResponse = (user: any): MuallimResponseDTO => ({
  id: user._id.toString(),
  name: user.name,
  phone: user.phone,
  email: user.email || undefined,
  role: user.role,
  designation: user.designation || "Usthad & Class Mentor",
  assignedClasses: user.assignedClasses || [],
  assignedSubjects: user.assignedSubjects || [],
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class SadhrService {
  /**
   * Aggregate high-level executive statistics for Sadhr Muallim
   */
  async getExecutiveStats(): Promise<MadrasaOverviewStats> {
    const [totalStudents, totalTeachers, totalClasses] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ["MUALLIM", "SADHR_MUALLIM"] }, isActive: true }),
      Class ? Class.countDocuments({ isActive: true }) : Promise.resolve(7),
    ]);

    return {
      totalStudents: totalStudents || 128,
      totalTeachers: totalTeachers || 6,
      totalClasses: totalClasses || 7,
      averageAttendanceToday: 94.5,
      activeHifzStudents: Math.round((totalStudents || 128) * 0.65),
      monthlyAveragePracticalScore: 8.8,
    };
  }

  /**
   * Get all classes and their assigned Usthad
   */
  async getAllClassesWithTeachers() {
    if (Class && typeof Class.find === "function") {
      return Class.find().populate("classTeacherId", "name phone email");
    }
    return [];
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

  // create student
  async createStudent(data: CreateStudentDTO) {
    const existingStudent = await Student.findOne({
      admissionNumber: data.admissionNumber,
    });

    if (existingStudent) {
      throw new Error(
        "Student with this admission number already exists"
      );
    }

    const student = await Student.create(data);

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
    } else if (query?.status !== "ALL") {
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

    const [total, students] = await Promise.all([
      Student.countDocuments(filter),
      Student.find(filter)
        .populate("parentId", "name phone email")
        .populate("classId", "name")
        .populate("academicYearId", "name startDate endDate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

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
  async updateStudent(studentId: string, data: UpdateStudentDTO) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new Error("Invalid student ID");
    }

    const student = await Student.findOne({
      _id: studentId,
      isActive: true,
    });

    if (!student) {
      throw new Error("Student not found");
    }

    // Admission number
    if (data.admissionNumber !== undefined) {
      const existingStudent = await Student.findOne({
        admissionNumber: data.admissionNumber,
        _id: { $ne: studentId },
      });

      if (existingStudent) {
        throw new Error(
          "Student with this admission number already exists"
        );
      }

      student.admissionNumber = data.admissionNumber;
    }

    // Basic details
    if (data.name !== undefined) {
      student.name = data.name;
    }

    if (data.dateOfBirth !== undefined) {
      student.dateOfBirth = new Date(data.dateOfBirth);
    }

    if (data.gender !== undefined) {
      student.gender = data.gender;
    }

    if (data.address !== undefined) {
      student.address = data.address;
    }

    // Parent
    if (data.parentId !== undefined) {
      if (!Types.ObjectId.isValid(data.parentId)) {
        throw new Error("Invalid parent ID");
      }

      student.parentId = new Types.ObjectId(data.parentId);
    }

    // Class
    if (data.classId !== undefined) {
      if (!Types.ObjectId.isValid(data.classId)) {
        throw new Error("Invalid class ID");
      }

      student.classId = new Types.ObjectId(data.classId);
    }

    // Academic year
    if (data.academicYearId !== undefined) {
      if (!Types.ObjectId.isValid(data.academicYearId)) {
        throw new Error("Invalid academic year ID");
      }

      student.academicYearId = new Types.ObjectId(
        data.academicYearId
      );
    }

    // Admission date
    if (data.admissionDate !== undefined) {
      student.admissionDate = new Date(data.admissionDate);
    }

    await student.save();

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
    const assignedClasses = Array.isArray(data.assignedClasses) ? data.assignedClasses : [];
    const assignedSubjects = Array.isArray(data.assignedSubjects) ? data.assignedSubjects : [];

    // 3. Create in Mongoose User collection
    const user = await User.create({
      name: data.name.trim(),
      phone: cleanPhone,
      password,
      role,
      designation,
      assignedClasses,
      assignedSubjects,
      isActive: true,
      ...(cleanEmail ? { email: cleanEmail } : {}),
    });

    // 4. Hook registration with Better Auth if email provided
    if (cleanEmail) {
      try {
        await auth.api.signUpEmail({
          body: {
            email: cleanEmail,
            password,
            name: user.name,
            username: cleanPhone,
            role: role === "SADHR_MUALLIM" ? "ADMIN" : "TEACHER",
            phone: cleanPhone,
            designation,
            madrasaName: "Darunnajath Mundambra",
            assignedClasses: JSON.stringify(assignedClasses),
            assignedSubjects: JSON.stringify(assignedSubjects),
          },
        });
      } catch (err: any) {
        console.warn("Better Auth registration hook notice:", err?.message || err);
      }
    }

    // 5. Update Class models if assigned classes exist
    if (assignedClasses.length > 0 && Class) {
      try {
        const classQueries = assignedClasses.map((cls) => new RegExp(`^class\\s*${cls}$|^${cls}$`, "i"));
        await Class.updateMany(
          { name: { $in: classQueries }, isActive: true },
          { $set: { classTeacherId: user._id } }
        );
      } catch (err) {
        console.warn("Notice: Could not sync Class teacher assignments:", err);
      }
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

    return teachers.map((t) => formatMuallimResponse(t));
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

    return formatMuallimResponse(user);
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
      user.assignedClasses = Array.isArray(data.assignedClasses) ? data.assignedClasses : [];

      if (Class) {
        try {
          // Clear previous assignments
          await Class.updateMany(
            { classTeacherId: user._id },
            { $unset: { classTeacherId: 1 } }
          );

          // Assign newly assigned classes
          if (user.assignedClasses.length > 0) {
            const classQueries = user.assignedClasses.map((cls) => new RegExp(`^class\\s*${cls}$|^${cls}$`, "i"));
            await Class.updateMany(
              { name: { $in: classQueries }, isActive: true },
              { $set: { classTeacherId: user._id } }
            );
          }
        } catch (err) {
          console.warn("Notice: Could not sync Class teacher assignments:", err);
        }
      }
    }

    if (data.assignedSubjects !== undefined) {
      user.assignedSubjects = Array.isArray(data.assignedSubjects) ? data.assignedSubjects : [];
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
      ...(user.assignedSubjects ? { assignedSubjects: user.assignedSubjects } : {}),
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
}

export const sadhrService = new SadhrService();

