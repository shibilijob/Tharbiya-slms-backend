import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISubject extends Document {
  name: string;
  arabicTitle: string;
  malayalamTitle: string;
  classId?: Types.ObjectId | null;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    arabicTitle: {
      type: String,
      trim: true,
      default: "",
    },

    malayalamTitle: {
      type: String,
      trim: true,
      default: "",
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: false,
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    color: {
      type: String,
      default: "#0F6B50",
    },

    icon: {
      type: String,
      default: "BookOpen",
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

const Subject = mongoose.model<ISubject>("Subject", subjectSchema);

export default Subject;