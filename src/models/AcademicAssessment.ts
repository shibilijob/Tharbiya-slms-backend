import mongoose, { Schema, Types } from "mongoose";

export interface IAcademicAssessment extends mongoose.Document {
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  subject: string;
  examTerm: string;
  date: Date;
  maxMarks: number;
  obtainedMarks: number;
  grade: string;
  remarks?: string;
  teacherId: Types.ObjectId;
}

const schema = new Schema<IAcademicAssessment>({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  classId: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
  subject: { type: String, required: true, trim: true },
  examTerm: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  maxMarks: { type: Number, required: true, min: 1 },
  obtainedMarks: { type: Number, required: true, min: 0 },
  grade: { type: String, required: true, enum: ["A+", "A", "B+", "B", "C+", "C", "D"] },
  remarks: { type: String, trim: true, default: "" },
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

schema.index({ studentId: 1, subject: 1, examTerm: 1 }, { unique: true });
export default mongoose.models.AcademicAssessment || mongoose.model<IAcademicAssessment>("AcademicAssessment", schema);
