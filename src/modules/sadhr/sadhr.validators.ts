import type { CreateAnnouncementDTO, CreateMuallimDTO, UpdateMuallimDTO } from "./sadhr.types.js";

export const validateAnnouncementInput = (
  data: CreateAnnouncementDTO
): { isValid: boolean; error?: string } => {
  if (!data.title || typeof data.title !== "string" || data.title.trim().length < 3) {
    return { isValid: false, error: "Title is required (min 3 characters)" };
  }

  if (!data.message || typeof data.message !== "string" || data.message.trim().length < 5) {
    return { isValid: false, error: "Message content is required (min 5 characters)" };
  }

  const validAudiences = ["ALL", "PARENTS", "TEACHERS"];
  if (!data.targetAudience || !validAudiences.includes(data.targetAudience)) {
    return { isValid: false, error: "Target audience must be ALL, PARENTS, or TEACHERS" };
  }

  return { isValid: true };
};

export const validateCreateMuallimInput = (
  data: CreateMuallimDTO
): { isValid: boolean; error?: string } => {
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    return { isValid: false, error: "Usthad / Muallim name is required (min 2 characters)" };
  }

  if (!data.phone || typeof data.phone !== "string" || data.phone.trim().length < 5) {
    return { isValid: false, error: "Valid phone number is required" };
  }

  if (data.email && typeof data.email === "string" && data.email.trim() !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      return { isValid: false, error: "Invalid email address format" };
    }
  }

  if (data.role && !["MUALLIM", "SADHR_MUALLIM"].includes(data.role)) {
    return { isValid: false, error: "Role must be either MUALLIM or SADHR_MUALLIM" };
  }

  if (data.password && (typeof data.password !== "string" || data.password.length < 5)) {
    return { isValid: false, error: "Password must be at least 5 characters long if provided" };
  }

  return { isValid: true };
};

export const validateUpdateMuallimInput = (
  data: UpdateMuallimDTO
): { isValid: boolean; error?: string } => {
  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length < 2)) {
    return { isValid: false, error: "Name must be at least 2 characters long" };
  }

  if (data.phone !== undefined && (typeof data.phone !== "string" || data.phone.trim().length < 5)) {
    return { isValid: false, error: "Valid phone number is required" };
  }

  if (data.email !== undefined && data.email !== "" && typeof data.email === "string") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      return { isValid: false, error: "Invalid email address format" };
    }
  }

  if (data.role !== undefined && !["MUALLIM", "SADHR_MUALLIM"].includes(data.role)) {
    return { isValid: false, error: "Role must be either MUALLIM or SADHR_MUALLIM" };
  }

  if (data.password !== undefined && (typeof data.password !== "string" || data.password.length < 5)) {
    return { isValid: false, error: "Password must be at least 5 characters long" };
  }

  return { isValid: true };
};

export const validateCreateParentInput = (
  data: any
): { isValid: boolean; error?: string } => {
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    return { isValid: false, error: "Guardian / Parent name is required (min 2 characters)" };
  }

  if (!data.phone || typeof data.phone !== "string" || data.phone.trim().length < 5) {
    return { isValid: false, error: "Valid mobile phone number is required" };
  }

  if (data.email && typeof data.email === "string" && data.email.trim() !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      return { isValid: false, error: "Invalid email address format" };
    }
  }

  if (data.password && (typeof data.password !== "string" || data.password.length < 4)) {
    return { isValid: false, error: "Password must be at least 4 characters long" };
  }

  return { isValid: true };
};

export const validateUpdateParentInput = (
  data: any
): { isValid: boolean; error?: string } => {
  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length < 2)) {
    return { isValid: false, error: "Name must be at least 2 characters long" };
  }

  if (data.phone !== undefined && (typeof data.phone !== "string" || data.phone.trim().length < 5)) {
    return { isValid: false, error: "Valid phone number is required" };
  }

  if (data.email !== undefined && data.email !== "" && typeof data.email === "string") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      return { isValid: false, error: "Invalid email address format" };
    }
  }

  if (data.password !== undefined && (typeof data.password !== "string" || data.password.length < 4)) {
    return { isValid: false, error: "Password must be at least 4 characters long" };
  }

  return { isValid: true };
};

export const validateCreateClassInput = (
  data: any
): { isValid: boolean; error?: string } => {
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 1) {
    return { isValid: false, error: "Class name is required (e.g. Class 1)" };
  }

  return { isValid: true };
};

export const validateUpdateClassInput = (
  data: any
): { isValid: boolean; error?: string } => {
  if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim().length < 1)) {
    return { isValid: false, error: "Class name cannot be empty" };
  }

  return { isValid: true };
};
