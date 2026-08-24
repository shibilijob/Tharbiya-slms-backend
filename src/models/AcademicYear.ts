import mongoose, { Document, Schema } from "mongoose";

export interface IAcademicYear extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const academicYearSchema = new Schema<IAcademicYear>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
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

const AcademicYear: mongoose.Model<IAcademicYear> =
  (mongoose.models.AcademicYear as mongoose.Model<IAcademicYear>) ||
  mongoose.model<IAcademicYear>("AcademicYear", academicYearSchema);

export default AcademicYear;
