import mongoose, { Document, Schema, Types } from "mongoose";

export type MadrasaDay =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export interface ITimetablePeriod extends Document {
  classId: Types.ObjectId;
  day: MadrasaDay;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  subjectMalayalam?: string | undefined;
  teacherName?: string | undefined;
  teacherId?: Types.ObjectId | undefined;
  room?: string | undefined;
  notes?: string | undefined;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const timetablePeriodSchema = new Schema<ITimetablePeriod>(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    day: {
      type: String,
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      required: true,
    },
    periodNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    subjectMalayalam: {
      type: String,
      trim: true,
    },
    teacherName: {
      type: String,
      trim: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    room: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
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

const TimetablePeriod = mongoose.model<ITimetablePeriod>(
  "TimetablePeriod",
  timetablePeriodSchema
);

export default TimetablePeriod;
