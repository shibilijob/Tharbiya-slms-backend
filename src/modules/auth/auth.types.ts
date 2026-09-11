export type UserRole = "SADHR_MUALLIM" | "MUALLIM" | "PARENT";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  designation?: string;
  madrasaName?: string;
  assignedClasses?: string;
  studentIds?: string;
  avatar?: string;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginDTO {
  identifier?: string | undefined; // email or phone number
  email?: string | undefined;
  phone?: string | undefined;
  password: string;
  role?: UserRole | undefined;
}

export interface StaffLoginDTO {
  email?: string | undefined;
  identifier?: string | undefined;
  password: string;
  role?: UserRole | undefined;
}

export type MuallimLoginDTO = StaffLoginDTO;
export type SadhrLoginDTO = StaffLoginDTO;

export interface ParentLoginDTO {
  phone: string;
  password: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  designation?: string | undefined;
  assignedClasses?: string[] | undefined;
}

export interface LinkedStudent {
  id: string;
  name: string;
  admissionNumber: string;
  gender: "MALE" | "FEMALE";
  classId?: string;
  className?: string;
  division?: string;
}

export interface MuallimAuthPayload {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "MUALLIM";
  designation?: string;
  madrasaName: string;
  assignedClasses: string[];
  avatar?: string;
}

export interface SadhrAuthPayload {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "SADHR_MUALLIM";
  designation: string;
  madrasaName: string;
  isAdmin: boolean;
  isSadhr: boolean;
  assignedClasses: string[];
  avatar?: string;
}

export type StaffAuthPayload = MuallimAuthPayload | SadhrAuthPayload;

export interface ParentAuthPayload {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "PARENT";
  madrasaName: string;
  studentIds: string[];
  children: LinkedStudent[];
  avatar?: string;
}

export interface AuthLoginResponse<T = any> {
  success: boolean;
  message: string;
  user: T;
  session?: any;
  token?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthenticatedUser | null;
  token?: string;
}
