import mongoose, { Document, Schema, Types } from "mongoose";

export type TargetStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface IHifzSchedule {
  dateFrom: Date;
  dateTo: Date;
  ayahFrom: number;
  ayahTo: number;
}

export interface IHifzTarget extends Document {
  classId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  criteria: string;
  juzNumber?: number;
  surahNumber?: number;
  surahName?: string;
  totalAyahsToMemorize?: number;
  fromAyah?: number;
  toAyah?: number;
  schedules: IHifzSchedule[];
  startDate: Date;
  endDate: Date;
  status: TargetStatus;
  isActive: boolean;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hifzTargetSchema = new Schema<IHifzTarget>(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },
    criteria: {
      type: String,
      required: true,
      trim: true,
    },
    juzNumber: {
      type: Number,
      min: 1,
      max: 30,
    },
    surahNumber: {
      type: Number,
      min: 1,
      max: 114,
    },
    surahName: {
      type: String,
      trim: true,
    },
    totalAyahsToMemorize: {
      type: Number,
      min: 1,
    },
    fromAyah: {
      type: Number,
      min: 1,
    },
    toAyah: {
      type: Number,
      min: 1,
    },
    schedules: [
      {
        dateFrom: {
          type: Date,
          required: true,
        },
        dateTo: {
          type: Date,
          required: true,
        },
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
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal querying (NO unique constraint on classId - multiple targets per class)
hifzTargetSchema.index({ classId: 1, academicYearId: 1, isActive: 1 });
hifzTargetSchema.index({ classId: 1, startDate: 1, endDate: 1 });
hifzTargetSchema.index({ classId: 1, status: 1 });

export const HifzTarget: mongoose.Model<IHifzTarget> =
  (mongoose.models.HifzTarget as mongoose.Model<IHifzTarget>) ||
  mongoose.model<IHifzTarget>("HifzTarget", hifzTargetSchema);

export default HifzTarget;
