import mongoose, { Document, Schema, Types } from "mongoose";

export interface IClass extends Document {
  name: string; // e.g. "Class 1", "Class 5"
  division?: string; // e.g. "A", "B"
  classTeacherId?: Types.ObjectId;
  academicYearId?: Types.ObjectId;
  capacity?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    division: {
      type: String,
      trim: true,
      default: "A",
    },
    classTeacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
    },
    capacity: {
      type: Number,
      default: 30,
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

const Class = mongoose.model<IClass>("Class", classSchema);

export default Class;
