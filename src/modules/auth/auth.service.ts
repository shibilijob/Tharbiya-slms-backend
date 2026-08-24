import { auth } from "./auth.js";
import User, { type IUser } from "../../models/User.js";
import Student from "../../models/Student.js";
import Class from "../../models/Class.js";
import { AppError } from "../../utils/AppError.js";
import type {
  RegisterDTO,
  LoginDTO,
  StaffLoginDTO,
  MuallimLoginDTO,
  SadhrLoginDTO,
  ParentLoginDTO,
  StaffAuthPayload,
  MuallimAuthPayload,
  SadhrAuthPayload,
  ParentAuthPayload,
  AuthLoginResponse,
  UserRole,
} from "./auth.types.js";

const DEFAULT_MADRASA_NAME = "Darunnajath Mundambra";

export class AuthService {
  /**
   * Helper: Find user in Mongoose by email or phone number
   */
  async getUserByEmailOrPhone(identifier: string): Promise<IUser | null> {
    const cleanId = identifier.trim();
    return User.findOne({
      $or: [{ email: cleanId.toLowerCase() }, { phone: cleanId }],
    });
  }

  /**
   * Helper: Authenticate session via Better Auth with Mongoose fallback
   */
  private async authenticateSession(user: IUser, password?: string): Promise<any> {
    let session: any = null;
    const pwd = password?.trim();

    if (!pwd) {
      throw new AppError("Password is required.", 400);
    }

    // 1. Check direct password match against Mongoose record
    if (user.password && user.password === pwd) {
      return {
        token: `sess_${user._id}_${Date.now()}`,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }

    // 2. Try Better Auth authentication
    try {
      if (user.email) {
        session = await auth.api.signInEmail({
          body: {
            email: user.email.toLowerCase(),
            password: pwd,
          },
        });
      } else if (user.phone) {
        session = await auth.api.signInUsername({
          body: {
            username: user.phone,
            password: pwd,
          },
        });
      }
    } catch {
      throw new AppError("Invalid credentials: Incorrect password.", 401);
    }

    if (!session) {
      throw new AppError("Invalid credentials: Incorrect password.", 401);
    }

    return session;
  }

  /**
   * Unified Staff (Muallim & Sadhr Muallim) Login Service
   * Authenticates staff credentials and dynamically applies role-based access & permissions.
   */
  async loginStaff(
    data: StaffLoginDTO,
    expectedRole?: UserRole
  ): Promise<AuthLoginResponse<StaffAuthPayload>> {
    const rawIdentifier = (data.email || (data as any).phone || data.identifier)?.trim();
    const password = data.password;

    if (!rawIdentifier) {
      throw new AppError("Staff email or phone number is required.", 400);
    }

    const user = await User.findOne({
      $or: [{ email: rawIdentifier.toLowerCase() }, { phone: rawIdentifier }],
    });

    if (!user) {
      throw new AppError("Invalid credentials: No staff account found.", 401);
    }

    if (!user.isActive) {
      throw new AppError("Your account is inactive. Please contact the administration.", 401);
    }

    // Role-based access validation: Ensure user is a recognized faculty member
    if (user.role !== "MUALLIM" && user.role !== "SADHR_MUALLIM") {
      throw new AppError(
        `Access restricted: Account is registered as ${user.role}. Faculty credentials required.`,
        403
      );
    }

    // If specific Sadhr Muallim endpoint is accessed, require SADHR_MUALLIM role
    if (expectedRole === "SADHR_MUALLIM" && user.role !== "SADHR_MUALLIM") {
      throw new AppError(
        `Access restricted: Sadhr Muallim administrative privileges required. Account role is ${user.role}.`,
        403
      );
    }

    const session = await this.authenticateSession(user, password);

    // Role-based payload & permission generation
    let userPayload: StaffAuthPayload;

    if (user.role === "SADHR_MUALLIM") {
      userPayload = {
        id: user._id.toString(),
        name: user.name,
        email: user.email || "",
        phone: user.phone,
        role: "SADHR_MUALLIM",
        designation: (user as any).designation || "Sadhr Muallim (Sadhr Mudarris)",
        madrasaName: DEFAULT_MADRASA_NAME,
        isAdmin: true,
        isSadhr: true,
        assignedClasses: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        assignedSubjects: ["Fiqh", "Quran", "Islamic Studies", "Tafseer"],
      };
    } else {
      // MUALLIM (Teacher)
      let assignedClasses: string[] = [];

      // 1. Check user's assignedClasses or assignedClass on user document
      if (user.assignedClasses && Array.isArray(user.assignedClasses) && user.assignedClasses.length > 0) {
        assignedClasses = user.assignedClasses.map(c => String(c).replace(/^Class\s*/i, "").trim());
      } else if ((user as any).assignedClass) {
        const single = String((user as any).assignedClass).replace(/^Class\s*/i, "").trim();
        if (single) assignedClasses = [single];
      }

      // 2. Lookup Class collection if not explicitly stored on user
      if (assignedClasses.length === 0) {
        const teacherClasses = await Class.find({ classTeacherId: user._id, isActive: true });
        if (teacherClasses.length > 0) {
          assignedClasses = teacherClasses.map((c) => c.name.replace(/^Class\s*/i, "").trim() || c.name);
        }
      }

      const assignedSubjects = user.assignedSubjects && user.assignedSubjects.length > 0
        ? user.assignedSubjects
        : ["Quran", "Hifz", "Tajweed", "Fiqh", "Akhlaq"];

      userPayload = {
        id: user._id.toString(),
        name: user.name,
        email: user.email || "",
        phone: user.phone,
        role: "MUALLIM",
        designation: (user as any).designation || "Usthad & Class Mentor",
        madrasaName: DEFAULT_MADRASA_NAME,
        assignedClasses,
        assignedSubjects,
      };
    }

    const roleDisplayName = user.role === "SADHR_MUALLIM" ? "Sadhr Muallim" : "Muallim";

    return {
      success: true,
      message: `${roleDisplayName} login successful`,
      user: userPayload,
      session,
    };
  }

  /**
   * Dedicated Muallim Login Handler (calls unified loginStaff with MUALLIM role requirement)
   */
  async loginMuallim(data: MuallimLoginDTO): Promise<AuthLoginResponse<MuallimAuthPayload>> {
    return this.loginStaff(data, "MUALLIM") as Promise<AuthLoginResponse<MuallimAuthPayload>>;
  }

  /**
   * Dedicated Sadhr Muallim Login Handler (calls unified loginStaff with SADHR_MUALLIM role requirement)
   */
  async loginSadhrMuallim(data: SadhrLoginDTO): Promise<AuthLoginResponse<SadhrAuthPayload>> {
    return this.loginStaff(data, "SADHR_MUALLIM") as Promise<AuthLoginResponse<SadhrAuthPayload>>;
  }

  /**
   * 2. Login Service for Parent
   * Requires Mobile Phone Number and Password. Enforces PARENT role.
   */
  async loginParent(data: ParentLoginDTO): Promise<AuthLoginResponse<ParentAuthPayload>> {
    const phone = (data.phone || (data as any).identifier)?.trim();
    const password = data.password;

    if (!phone) {
      throw new AppError("Parent mobile phone number is required.", 400);
    }

    const user = await User.findOne({ phone });

    if (!user) {
      throw new AppError("Invalid credentials: No parent account registered with this mobile number.", 401);
    }

    if (!user.isActive) {
      throw new AppError("Your Parent account is inactive. Please contact the Madrasa office.", 401);
    }

    if (user.role !== "PARENT") {
      throw new AppError(
        `Access restricted: Account is registered as ${user.role}. Parent portal requires a parent account.`,
        403
      );
    }

    const session = await this.authenticateSession(user, password);

    // Query all students linked to this parent
    const students = await Student.find({ parentId: user._id, isActive: true })
      .populate("classId")
      .lean();

    const children = students.map((s: any) => ({
      id: s._id.toString(),
      name: s.name,
      admissionNumber: s.admissionNumber,
      gender: s.gender as "MALE" | "FEMALE",
      classId: s.classId?._id?.toString() || "",
      className: s.classId?.name || "Class 5",
      division: s.classId?.division || "A",
    }));

    const studentIds = children.map((c) => c.id);

    const parentPayload: ParentAuthPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email || "",
      phone: user.phone,
      role: "PARENT",
      madrasaName: DEFAULT_MADRASA_NAME,
      studentIds,
      children,
    };

    return {
      success: true,
      message: "Parent login successful",
      user: parentPayload,
      session,
    };
  }

  /**
   * Unified Login router
   * Automatically resolves role or routes to the requested role handler
   */
  async login(data: LoginDTO): Promise<AuthLoginResponse<any>> {
    const rawIdentifier = data.identifier || data.email || data.phone;
    const identifier = rawIdentifier?.trim();
    if (!identifier) {
      throw new AppError("Email or phone number is required.", 400);
    }

    // If specific role requested, route accordingly
    if (data.role === "SADHR_MUALLIM" || data.role === "MUALLIM") {
      return this.loginStaff({ email: (data.email || identifier)!, password: data.password });
    }
    if (data.role === "PARENT") {
      return this.loginParent({ phone: (data.phone || identifier)!, password: data.password });
    }

    // Otherwise determine role by looking up user
    const user = await this.getUserByEmailOrPhone(identifier);
    if (!user) {
      throw new AppError("Invalid credentials: User not found.", 401);
    }

    switch (user.role) {
      case "SADHR_MUALLIM":
      case "MUALLIM":
        return this.loginStaff({ email: user.email || identifier, password: data.password });
      case "PARENT":
      default:
        return this.loginParent({ phone: user.phone, password: data.password });
    }
  }

  /**
   * Register a new user in Mongoose and Better Auth
   */
  async register(data: RegisterDTO): Promise<any> {
    // 1. Create in Mongoose User collection
    const user = await User.create({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      password: data.password,
      role: data.role,
      isActive: true,
    });

    // 2. Create in Better Auth
    try {
      await auth.api.signUpEmail({
        body: {
          email: data.email.trim().toLowerCase(),
          password: data.password,
          name: data.name.trim(),
          username: data.phone.trim(),
          role: data.role || "PARENT",
          phone: data.phone.trim(),
          designation: data.designation || "",
          madrasaName: DEFAULT_MADRASA_NAME,
          assignedClasses: JSON.stringify(data.assignedClasses || []),
          assignedSubjects: JSON.stringify(data.assignedSubjects || []),
        },
      });
    } catch (err) {
      console.warn("Better auth registration hook notice:", err);
    }

    return user;
  }

  /**
   * Get all active teachers and sadhr muallim
   */
  async getFaculty() {
    return User.find({
      role: { $in: ["SADHR_MUALLIM", "MUALLIM"] },
      isActive: true,
    }).select("-password");
  }
}

export const authService = new AuthService();
