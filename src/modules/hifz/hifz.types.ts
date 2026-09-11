export type HifzRecordStatus = "COMPLETED" | "PARTIAL" | "NOT_COMPLETED";
export type TargetStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface HifzScheduleDTO {
  dateFrom: string | Date;
  dateTo: string | Date;
  ayahFrom: number;
  ayahTo: number;
}

export interface HifzRangeDTO {
  ayahFrom: number;
  ayahTo: number;
}

export interface CreateHifzTargetDTO {
  classId: string;
  academicYearId?: string;
  criteria: string;
  juzNumber?: number;
  surahNumber?: number;
  surahName?: string;
  totalAyahsToMemorize?: number;
  fromAyah?: number;
  toAyah?: number;
  schedules?: HifzScheduleDTO[];
  startDate: string | Date;
  endDate: string | Date;
  status?: TargetStatus;
  isActive?: boolean;
}

export interface UpdateHifzTargetDTO {
  criteria?: string;
  juzNumber?: number;
  surahNumber?: number;
  surahName?: string;
  totalAyahsToMemorize?: number;
  fromAyah?: number;
  toAyah?: number;
  schedules?: HifzScheduleDTO[];
  startDate?: string | Date;
  endDate?: string | Date;
  status?: TargetStatus;
  isActive?: boolean;
}

export interface HifzTargetResponseDTO {
  id: string;
  classId: string;
  className?: string;
  academicYearId: string;
  academicYearName?: string;
  criteria: string;
  juzNumber?: number;
  surahNumber?: number;
  surahName?: string;
  totalAyahsToMemorize?: number;
  fromAyah?: number;
  toAyah?: number;
  schedules: HifzScheduleDTO[];
  startDate: string;
  endDate: string;
  status: TargetStatus;
  isActive: boolean;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHifzRecordDTO {
  studentId: string;
  classId: string;
  hifzTargetId: string;
  date?: string | Date;
  progress: string;
  completedAyahFrom?: number;
  completedAyahTo?: number;
  completedRanges?: HifzRangeDTO[];
  status?: HifzRecordStatus | string;
  remark?: string;
}

export interface UpdateHifzRecordDTO {
  date?: string | Date;
  progress?: string;
  completedAyahFrom?: number;
  completedAyahTo?: number;
  completedRanges?: HifzRangeDTO[];
  status?: HifzRecordStatus | string;
  remark?: string;
}

export interface HifzRecordResponseDTO {
  id: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  classId: string;
  className?: string;
  hifzTargetId: string;
  targetCriteria?: string;
  date: string;
  progress: string;
  completedAyahFrom?: number;
  completedAyahTo?: number;
  completedRanges: HifzRangeDTO[];
  status: HifzRecordStatus;
  remark?: string;
  recordedById: string;
  recordedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentHifzSummary {
  studentId: string;
  totalMemorizedSurahs: number;
  completedTargetsCount?: number;
  currentSurah: string;
  currentAyah: number;
  averageRating: number;
  recentLogs: any[];
}

export interface ParentHifzProgressDTO {
  student: {
    id: string;
    name: string;
    classId: string;
    className: string;
  };
  target: HifzTargetResponseDTO | null;
  completedAyahs: number[];
  logs: HifzRecordResponseDTO[];
}
