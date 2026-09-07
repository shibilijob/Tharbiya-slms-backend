import type {
  LoginDTO,
  StaffLoginDTO,
  MuallimLoginDTO,
  SadhrLoginDTO,
  ParentLoginDTO,
  RegisterDTO,
} from "./auth.types.js";

/**
 * Universal login input validator
 */
export const validateLoginInput = (data: LoginDTO): { isValid: boolean; error?: string } => {
  const identifier = data.identifier || data.email || data.phone;
  if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
    return { isValid: false, error: "Email or phone number is required" };
  }

  if (!data.password || typeof data.password !== "string" || data.password.length < 3) {
    return { isValid: false, error: "Password must be provided (at least 3 characters)" };
  }

  return { isValid: true };
};

/**
 * Staff (Muallim & Sadhr Muallim) login input validator
 * Requires email and password
 */
export const validateStaffLoginInput = (
  data: StaffLoginDTO | { email?: string; identifier?: string; password?: string }
): { isValid: boolean; error?: string } => {
  const email = (data as any).email || (data as any).identifier;
  if (!email || typeof email !== "string" || !email.trim()) {
    return { isValid: false, error: "Staff email address is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: "Please enter a valid email address (e.g. usthad@darunnajath.edu)" };
  }

  if (!data.password || typeof data.password !== "string" || data.password.length < 3) {
    return { isValid: false, error: "Password is required" };
  }

  return { isValid: true };
};

export const validateMuallimLoginInput = validateStaffLoginInput;
export const validateSadhrLoginInput = validateStaffLoginInput;

/**
 * Parent login input validator
 * Requires phone number and password
 */
export const validateParentLoginInput = (
  data: ParentLoginDTO | { phone?: string; identifier?: string; password?: string }
): { isValid: boolean; error?: string } => {
  const phone = (data as any).phone || (data as any).identifier;
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return { isValid: false, error: "Parent mobile phone number is required" };
  }

  const cleanPhone = phone.trim();
  if (cleanPhone.length < 8) {
    return { isValid: false, error: "Please enter a valid mobile phone number (at least 8 digits)" };
  }

  if (!data.password || typeof data.password !== "string" || data.password.length < 3) {
    return { isValid: false, error: "Password or PIN is required" };
  }

  return { isValid: true };
};

/**
 * Registration input validator
 */
export const validateRegisterInput = (data: RegisterDTO): { isValid: boolean; error?: string } => {
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    return { isValid: false, error: "Full name is required (min 2 characters)" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email.trim())) {
    return { isValid: false, error: "A valid email address is required" };
  }

  if (!data.phone || data.phone.trim().length < 8) {
    return { isValid: false, error: "A valid phone number is required" };
  }

  if (!data.password || data.password.length < 5) {
    return { isValid: false, error: "Password must be at least 5 characters" };
  }

  const validRoles = ["SADHR_MUALLIM", "MUALLIM", "PARENT"];
  if (!data.role || !validRoles.includes(data.role)) {
    return { isValid: false, error: "Role must be SADHR_MUALLIM, MUALLIM, or PARENT" };
  }

  return { isValid: true };
};

/**
 * Muallim verify email input validator (Email Only)
 */
export const validateVerifyMuallimInput = (
  data: { email?: string; identifier?: string }
): { isValid: boolean; error?: string } => {
  const email = (data.email || data.identifier)?.trim();
  if (!email) {
    return { isValid: false, error: "Muallim registered email address is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address (e.g. usthad@darunnajath.edu)" };
  }

  return { isValid: true };
};

/**
 * Muallim password reset input validator (Email Only)
 */
export const validateResetMuallimPasswordInput = (
  data: { email?: string; identifier?: string; newPassword?: string; confirmPassword?: string }
): { isValid: boolean; error?: string } => {
  const email = (data.email || data.identifier)?.trim();
  if (!email) {
    return { isValid: false, error: "Muallim registered email address is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  if (!data.newPassword || typeof data.newPassword !== "string" || data.newPassword.length < 5) {
    return { isValid: false, error: "New password must be at least 5 characters long" };
  }
  if (data.confirmPassword && data.newPassword !== data.confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
  }
  return { isValid: true };
};
