import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPracticalSubject extends Document {
  name: string;
  classId: Types.ObjectId;
  maxScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const practicalSubjectSchema = new Schema<IPracticalSubject>(
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

    maxScore: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
      max: 100,
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

const PracticalSubject = mongoose.model<IPracticalSubject>(
  "PracticalSubject",
  practicalSubjectSchema
);

export default PracticalSubject;