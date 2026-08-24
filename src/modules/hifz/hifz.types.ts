export type HifzRating = 1 | 2 | 3 | 4 | 5; // 1 (Needs improvement) to 5 (Mumtaz / Excellent)
export type HifzSessionType = "SABAQ" | "SABQI" | "MANZIL" | "REVISION";

export interface RecordHifzDTO {
  studentId: string;
  classId: string;
  sessionType: HifzSessionType;
  surahNumber: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
  rating: HifzRating;
  mistakesCount?: number;
  remarks?: string;
  date?: string;
}

export interface StudentHifzSummary {
  studentId: string;
  totalMemorizedSurahs: number;
  currentSurah: string;
  currentAyah: number;
  averageRating: number;
  recentLogs: any[];
}
