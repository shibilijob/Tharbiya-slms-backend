import mongoose, { Document, Schema, Types } from "mongoose";
import type { UserRole } from "./User.js";

export interface IDeletedUser extends Document {
  originalUserId: Types.ObjectId;
  name: string;
  email?: string | null | undefined;
  phone: string;
  role: UserRole;
  designation?: string | undefined;
  assignedClasses?: string[] | undefined;
  isActive: boolean;
  deletedAt: Date;
  deletedBy: Types.ObjectId | string;
  reason?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const deletedUserSchema = new Schema<IDeletedUser>(
  {
    originalUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["SADHR_MUALLIM", "MUALLIM", "PARENT"],
      required: true,
    },

    designation: {
      type: String,
      trim: true,
    },

    assignedClasses: [
      {
        type: String,
        trim: true,
      },
    ],

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

    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const DeletedUser = mongoose.model<IDeletedUser>("DeletedUser", deletedUserSchema);

export default DeletedUser;
