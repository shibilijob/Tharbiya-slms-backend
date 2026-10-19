import mongoose, { Schema, Types } from "mongoose";

export interface IAuditLog extends mongoose.Document {
  actorId: Types.ObjectId;
  actorRole: string;
  classId?: Types.ObjectId;
  entityType: string;
  entityId?: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  timestamp: Date;
  outcome: "PENDING" | "SUCCESS" | "FAILED";
  requestId?: string;
  changes: { requested?: Record<string, unknown>; result?: Record<string, unknown> };
}

const schema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, required: true, immutable: true, index: true },
  actorRole: { type: String, required: true, immutable: true },
  classId: { type: Schema.Types.ObjectId, immutable: true, index: true },
  entityType: { type: String, required: true, immutable: true },
  entityId: { type: String },
  action: { type: String, enum: ["CREATE", "UPDATE", "DELETE"], required: true, immutable: true },
  timestamp: { type: Date, default: Date.now, immutable: true, index: true },
  outcome: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], required: true },
  requestId: { type: String, immutable: true },
  changes: { type: Schema.Types.Mixed, required: true },
}, { versionKey: false });

schema.index({ actorId: 1, timestamp: -1 });
schema.index({ classId: 1, timestamp: -1 });
schema.index({ outcome: 1, timestamp: -1 });

export default mongoose.model<IAuditLog>("AuditLog", schema);
