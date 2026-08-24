import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISubject extends Document {
  name: string;
  classId: Types.ObjectId;
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

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
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

const Subject = mongoose.model<ISubject>("Subject", subjectSchema);

export default Subject;