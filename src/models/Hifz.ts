import mongoose, { Document, Schema, Types } from "mongoose";

export type HifzSessionType = "SABAQ" | "SABQI" | "MANZIL" | "REVISION";
export type HifzRating = 1 | 2 | 3 | 4 | 5;

export interface IHifzLog extends Document {
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  sessionType: HifzSessionType;
  surahNumber: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
  rating: HifzRating;
  mistakesCount: number;
  remarks?: string;
  teacherId: Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const hifzLogSchema = new Schema<IHifzLog>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    sessionType: {
      type: String,
      enum: ["SABAQ", "SABQI", "MANZIL", "REVISION"],
      required: true,
      default: "SABAQ",
    },
    surahNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 114,
    },
    surahName: {
      type: String,
      required: true,
      trim: true,
    },
    fromAyah: {
      type: Number,
      required: true,
      min: 1,
    },
    toAyah: {
      type: Number,
      required: true,
      min: 1,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 4,
    },
    mistakesCount: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const HifzLog: mongoose.Model<IHifzLog> =
  (mongoose.models.HifzLog as mongoose.Model<IHifzLog>) ||
  mongoose.model<IHifzLog>("HifzLog", hifzLogSchema);

export default HifzLog;
