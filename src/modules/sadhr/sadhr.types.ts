export interface MadrasaOverviewStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  averageAttendanceToday: number;
  activeHifzStudents: number;
  monthlyAveragePracticalScore: number;
}

export interface ClassPerformanceOverview {
  classId: string;
  className: string;
  classTeacherName: string;
  studentCount: number;
  todayAttendancePercentage: number;
  averageHifzScore: number;
}

export interface CreateAnnouncementDTO {
  title: string;
  message: string;
  targetAudience: "ALL" | "PARENTS" | "TEACHERS";
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  expiresAt?: string;
}

/**
 * Create Student DTO
 */
export interface CreateStudentDTO {
  admissionNumber: string;
  name: string;
  dateOfBirth?: string;
  gender: "MALE" | "FEMALE";
  address?: string;

  parentId: string;
  classId: string;
  academicYearId: string;

  admissionDate?: string;
  isActive?: boolean;
}

export interface UpdateStudentDTO {
  admissionNumber?: string;
  name?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE";
  address?: string;

  parentId?: string;
  classId?: string;
  academicYearId?: string;

  admissionDate?: string;
}

/**
 * Muallim (Teacher) Management DTOs
 */
export interface CreateMuallimDTO {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role?: "MUALLIM" | "SADHR_MUALLIM";
  designation?: string;
  assignedClasses?: string[];
}

export interface UpdateMuallimDTO {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  role?: "MUALLIM" | "SADHR_MUALLIM";
  designation?: string;
  assignedClasses?: string[];
  isActive?: boolean;
}

export interface MuallimResponseDTO {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "MUALLIM" | "SADHR_MUALLIM" | "PARENT";
  designation?: string;
  assignedClasses?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination DTOs
 */
export interface PaginationQueryDTO {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  classId?: string | undefined;
  status?: string | undefined;
}

export interface PaginatedStudentResultDTO {
  students: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
}

/**
 * Parent Management DTOs
 */
export interface CreateParentDTO {
  name: string;
  phone: string;
  email?: string;
  password?: string;
}

export interface UpdateParentDTO {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
}

export interface ParentResponseDTO {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: "PARENT";
  studentIds: string[];
  children?: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    classDivision?: string;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Class Management DTOs
 */
export interface CreateClassDTO {
  name: string;
  division?: string;
  classTeacherId?: string;
  academicYearId?: string;
  capacity?: number;
}

export interface UpdateClassDTO {
  name?: string;
  division?: string;
  classTeacherId?: string;
  academicYearId?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface ClassResponseDTO {
  id: string;
  name: string;
  division?: string;
  classTeacherId?: string;
  classTeacherName?: string;
  classTeacherPhone?: string;
  studentCount: number;
  averageProgress: number;
  capacity?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

