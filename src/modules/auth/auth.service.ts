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

    // Determine assignedClasses from MongoDB record
    let assignedClasses: string[] = [];
    if (user.assignedClasses && Array.isArray(user.assignedClasses) && user.assignedClasses.length > 0) {
      assignedClasses = user.assignedClasses.map(c => String(c).replace(/^Class\s*/i, "").trim());
    } else if ((user as any).assignedClass) {
      const single = String((user as any).assignedClass).replace(/^Class\s*/i, "").trim();
      if (single) assignedClasses = [single];
    }

    // Lookup Class collection if not explicitly stored on user
    if (assignedClasses.length === 0) {
      const teacherClasses = await Class.find({ classTeacherId: user._id, isActive: true });
      if (teacherClasses.length > 0) {
        assignedClasses = teacherClasses.map((c) => c.name.replace(/^Class\s*/i, "").trim() || c.name);
      }
    }

    const assignedSubjects = user.assignedSubjects && user.assignedSubjects.length > 0
      ? user.assignedSubjects
      : user.role === "SADHR_MUALLIM"
      ? ["Fiqh", "Quran", "Islamic Studies", "Tafseer"]
      : ["Quran", "Hifz", "Tajweed", "Fiqh", "Akhlaq"];

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
        assignedClasses,
        assignedSubjects,
      };
    } else {
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

  /**
   * Verify Muallim identity for password reset (Email Only)
   */
  async verifyMuallim(email: string): Promise<{
    name: string;
    email: string;
    phone: string;
    designation?: string;
    role: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    
    // Strictly require email address (never search by phone number)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new AppError("Please provide a valid registered Usthad email address. Phone numbers cannot be used for password recovery.", 400);
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      throw new AppError("This email address is not registered in the Madrasa system. Please verify your email or contact Sadhr Muallim.", 404);
    }

    if (!user.isActive) {
      throw new AppError("This Usthad account is inactive. Please contact Sadhr Muallim.", 403);
    }

    if (user.role !== "MUALLIM" && user.role !== "SADHR_MUALLIM") {
      throw new AppError("This email does not belong to a Muallim account. Parents should contact Sadhr Muallim for password assistance.", 403);
    }

    return {
      name: user.name,
      email: user.email || "",
      phone: user.phone,
      designation: user.designation || (user.role === "SADHR_MUALLIM" ? "Sadhr Muallim" : "Muallim"),
      role: user.role,
    };
  }

  /**
   * Send Password Reset Email to Muallim via Better Auth + Brevo
   */
  async sendMuallimPasswordResetEmail(email: string): Promise<{
    success: boolean;
    message: string;
    email: string;
    name: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const verified = await this.verifyMuallim(cleanEmail);
    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

    try {
      // Trigger Better Auth password reset which generates the secure token and calls Brevo email handler
      await auth.api.requestPasswordReset({
        body: {
          email: cleanEmail,
          redirectTo: `${clientUrl}/reset-password`,
        },
      });
    } catch (baErr: any) {
      console.error("Better Auth requestPasswordReset error:", baErr);
      throw new AppError(
        baErr?.message || "Failed to dispatch password reset email. Please try again.",
        500
      );
    }

    return {
      success: true,
      message: `Password reset instructions have been sent to ${cleanEmail}. Please check your email inbox.`,
      email: cleanEmail,
      name: verified.name,
    };
  }

  /**
   * Reset Muallim Password with Token (Better Auth + Mongoose Sync)
   */
  async resetPasswordWithToken(data: { token?: string; email?: string; newPassword: string }): Promise<any> {
    const pwd = data.newPassword?.trim();
    if (!pwd || pwd.length < 5) {
      throw new AppError("Password must be at least 5 characters long.", 400);
    }

    if (!data.token) {
      throw new AppError("A valid password reset token is required.", 400);
    }

    let userEmail = data.email?.trim().toLowerCase();

    // 1. Execute Better Auth token reset (validates token expiration and authenticity)
    try {
      const baRes: any = await auth.api.resetPassword({
        body: {
          newPassword: pwd,
          token: data.token,
        },
      });
      if (baRes?.user?.email) {
        userEmail = baRes.user.email.toLowerCase();
      }
    } catch (err: any) {
      console.error("Better Auth token reset error:", err?.message || err);
      throw new AppError(err?.message || "Invalid or expired password reset token. Please request a new link.", 400);
    }

    // 2. Sync password in Mongoose User collection
    if (userEmail) {
      const user = await User.findOne({ email: userEmail });
      if (user) {
        if (user.role !== "MUALLIM" && user.role !== "SADHR_MUALLIM") {
          throw new AppError("Password reset is restricted to Muallim faculty accounts.", 403);
        }
        user.password = pwd;
        await user.save();
      }
    }

    return {
      success: true,
      message: "Password has been successfully updated. You can now log in.",
    };
  }
}

export const authService = new AuthService();
