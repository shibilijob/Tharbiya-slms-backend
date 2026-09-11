import mongoose, { Document, Schema, Types } from "mongoose";

export type HifzRecordStatus = "COMPLETED" | "PARTIAL" | "NOT_COMPLETED";

export interface IHifzRecord extends Document {
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  hifzTargetId: Types.ObjectId;
  date: Date;
  progress: string;
  completedAyahFrom?: number;
  completedAyahTo?: number;
  completedRanges: Array<{
    ayahFrom: number;
    ayahTo: number;
  }>;
  status: HifzRecordStatus;
  remark?: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hifzRecordSchema = new Schema<IHifzRecord>(
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
    hifzTargetId: {
      type: Schema.Types.ObjectId,
      ref: "HifzTarget",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    progress: {
      type: String,
      required: true,
      trim: true,
    },
    completedAyahFrom: {
      type: Number,
      min: 1,
    },
    completedAyahTo: {
      type: Number,
      min: 1,
    },
    completedRanges: [
      {
        ayahFrom: {
          type: Number,
          required: true,
          min: 1,
        },
        ayahTo: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    status: {
      type: String,
      enum: ["COMPLETED", "PARTIAL", "NOT_COMPLETED"],
      required: true,
      default: "COMPLETED",
      index: true,
    },
    remark: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal querying
hifzRecordSchema.index({ hifzTargetId: 1, studentId: 1 });
hifzRecordSchema.index({ studentId: 1, date: -1 });
hifzRecordSchema.index({ classId: 1, date: -1 });

export const HifzRecord: mongoose.Model<IHifzRecord> =
  (mongoose.models.HifzRecord as mongoose.Model<IHifzRecord>) ||
  mongoose.model<IHifzRecord>("HifzRecord", hifzRecordSchema);

export default HifzRecord;
