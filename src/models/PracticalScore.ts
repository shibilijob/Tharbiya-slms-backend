import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPracticalScore extends Document {
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  practicalSubjectId: Types.ObjectId;
  month: number; // 1 to 12
  year: number; // e.g. 2026
  score: number;
  maxScore: number;
  remarks?: string;
  evaluatedById: Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const practicalScoreSchema = new Schema<IPracticalScore>(
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
    practicalSubjectId: {
      type: Schema.Types.ObjectId,
      ref: "PracticalSubject",
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    maxScore: {
      type: Number,
      required: true,
      min: 1,
      default: 5,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    evaluatedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound UNIQUE index enforcing: Exactly one score per Student + Practical Subject + Month + Year
practicalScoreSchema.index(
  { studentId: 1, practicalSubjectId: 1, month: 1, year: 1 },
  { unique: true }
);

// Performance query indexes
practicalScoreSchema.index({ classId: 1, practicalSubjectId: 1, month: 1, year: 1 });
practicalScoreSchema.index({ classId: 1, month: 1, year: 1 });
practicalScoreSchema.index({ studentId: 1, month: 1, year: 1 });

const PracticalScore = mongoose.model<IPracticalScore>("PracticalScore", practicalScoreSchema);

export default PracticalScore;
