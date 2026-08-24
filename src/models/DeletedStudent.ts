import mongoose, { Document, Schema, Types } from "mongoose";

export interface IDeletedStudent extends Document {
  originalStudentId: Types.ObjectId;

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

  deletedAt: Date;
  deletedBy: Types.ObjectId | string;

  createdAt: Date;
  updatedAt: Date;
}

const deletedStudentSchema = new Schema<IDeletedStudent>(
  {
    originalStudentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    admissionNumber: {
      type: String,
      required: true,
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
      required: true,
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: Date.now,
    },

    deletedBy: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const DeletedStudent = mongoose.model<IDeletedStudent>(
  "DeletedStudent",
  deletedStudentSchema
);

export default DeletedStudent;