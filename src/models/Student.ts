import mongoose, { Document, Schema, Types } from "mongoose";

export interface IStudent extends Document {
  admissionNumber: string;
  name: string;
  dateOfBirth?: Date;
  gender: "MALE" | "FEMALE";
  address?: string;

  parentId: Types.ObjectId;
  classId: Types.ObjectId;
  academicYearId: Types.ObjectId;

  admissionDate: Date;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    admissionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE"],
      required: true,
    },

    address: {
      type: String,
      trim: true,
    },

    parentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },

    admissionDate: {
      type: Date,
      default: Date.now,
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

const Student = mongoose.model<IStudent>("Student", studentSchema);

export default Student;