import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMonthlyAttendanceBacklog extends Document {
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  year: number;
  month: number;
  monthName?: string;
  totalWorkingDays: number;
  attendedDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const monthlyAttendanceBacklogSchema = new Schema<IMonthlyAttendanceBacklog>(
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
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    monthName: {
      type: String,
      trim: true,
    },
    totalWorkingDays: {
      type: Number,
      required: true,
      min: 0,
    },
    attendedDays: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: ensure one backlog entry per student per month of a given year
monthlyAttendanceBacklogSchema.index({ studentId: 1, year: 1, month: 1 }, { unique: true });

export const MonthlyAttendanceBacklog: mongoose.Model<IMonthlyAttendanceBacklog> =
  (mongoose.models.MonthlyAttendanceBacklog as mongoose.Model<IMonthlyAttendanceBacklog>) ||
  mongoose.model<IMonthlyAttendanceBacklog>("MonthlyAttendanceBacklog", monthlyAttendanceBacklogSchema);

export default MonthlyAttendanceBacklog;
