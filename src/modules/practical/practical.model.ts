import mongoose, { Document, Schema, Types } from "mongoose";
import type { PracticalCategory } from "./practical.types.js";

export interface IPracticalEvaluation extends Document {
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  term?: string;
  month?: string;
  scores: Array<{
    category: PracticalCategory;
    practicalSubjectId?: Types.ObjectId;
    score: number;
    remarks?: string;
  }>;
  overallScore: number;
  overallRemarks?: string;
  evaluatedById: Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const practicalEvaluationSchema = new Schema<IPracticalEvaluation>(
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
    term: {
      type: String,
      trim: true,
      default: "Monthly Evaluation",
    },
    month: {
      type: String,
      trim: true,
    },
    scores: [
      {
        practicalSubjectId: {
          type: Schema.Types.ObjectId,
          ref: "PracticalSubject",
          required: false,
        },
        category: {
          type: String,
          required: true,
          trim: true,
        },
        score: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        remarks: {
          type: String,
          trim: true,
        },
      },
    ],
    overallScore: {
      type: Number,
      required: true,
      default: 0,
    },
    overallRemarks: {
      type: String,
      trim: true,
    },
    evaluatedById: {
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

const PracticalEvaluation = mongoose.model<IPracticalEvaluation>(
  "PracticalEvaluation",
  practicalEvaluationSchema
);

export default PracticalEvaluation;
