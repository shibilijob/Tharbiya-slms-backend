import mongoose, { Schema, Types } from "mongoose";

export interface IAcademicAssessment extends mongoose.Document {
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  subject: string;
  subjectId?: string;
  examTerm: string;
  assessmentId?: string;
  date: Date;
  maxMarks: number;
  obtainedMarks: number;
  grade: string;
  isAbsent?: boolean;
  remarks?: string;
  teacherId: Types.ObjectId;
}

const schema = new Schema<IAcademicAssessment>({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  classId: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
  subject: { type: String, required: true, trim: true },
  subjectId: { type: String, trim: true, index: true },
  examTerm: { type: String, required: true, trim: true },
  assessmentId: { type: String, trim: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  maxMarks: { type: Number, required: true, min: 1 },
  obtainedMarks: { type: Number, required: true, min: 0 },
  grade: { type: String, required: true },
  isAbsent: { type: Boolean, default: false },
  remarks: { type: String, trim: true, default: "" },
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

schema.index({ studentId: 1, assessmentId: 1, subjectId: 1 });
schema.index({ studentId: 1, subject: 1, examTerm: 1 });
export default mongoose.models.AcademicAssessment || mongoose.model<IAcademicAssessment>("AcademicAssessment", schema);
