import mongoose, { Document, Schema, Types } from "mongoose";
import type { MuallimShiftId, MuallimAttendanceStatusType } from "../constants/muallimShifts.js";

export interface IMuallimAttendance extends Document {
  userId: Types.ObjectId;
  date: Date;
  shiftId: MuallimShiftId;
  status: MuallimAttendanceStatusType;
  remarks?: string;
  holidayReason?: string | null;
  markedBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const muallimAttendanceSchema = new Schema<IMuallimAttendance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    shiftId: {
      type: String,
      enum: ["SHIFT_1", "SHIFT_2", "SHIFT_3"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PRESENT", "CL", "HPL", "LLP", "HOLIDAY"],
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    holidayReason: {
      type: String,
      default: null,
      trim: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: ensure exactly one record per Muallim per date per shift
muallimAttendanceSchema.index({ userId: 1, date: 1, shiftId: 1 }, { unique: true });
muallimAttendanceSchema.index({ userId: 1, date: 1 });

export const MuallimAttendance: mongoose.Model<IMuallimAttendance> =
  (mongoose.models.MuallimAttendance as mongoose.Model<IMuallimAttendance>) ||
  mongoose.model<IMuallimAttendance>("MuallimAttendance", muallimAttendanceSchema);

export default MuallimAttendance;
