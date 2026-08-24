import mongoose, { Document, Schema, Types } from "mongoose";

export type AchievementCategory =
  | "Weekly Hifz Completion"
  | "Monthly Practical Score Topper"
  | "Monthly Attendance Topper"
  | "Quran Recitation Star"
  | "Adab & Akhlaq Excellence"
  | "Academic Excellence"
  | string;

export interface IAchievement extends Document {
  studentId: Types.ObjectId;
  classId?: Types.ObjectId;
  title: string;
  titleMalayalam?: string;
  category: AchievementCategory;
  description: string;
  badgeIcon?: string;
  date: Date;
  awardedById: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const achievementSchema = new Schema<IAchievement>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleMalayalam: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      default: "General Achievement",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    badgeIcon: {
      type: String,
      default: "🏆",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    awardedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Achievement = mongoose.model<IAchievement>("Achievement", achievementSchema);

export default Achievement;
