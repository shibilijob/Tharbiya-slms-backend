import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "SADHR_MUALLIM" | "MUALLIM" | "PARENT";

export interface IUser extends Document {
  name: string;
  email?: string | null | undefined;
  phone: string;
  password: string;
  role: UserRole;
  designation?: string | undefined;
  assignedClasses?: string[] | undefined;
  isActive: boolean;
  deletedAt?: Date | undefined;
  deletedBy?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      sparse: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 5,
    },

    role: {
      type: String,
      enum: ["SADHR_MUALLIM", "MUALLIM", "PARENT"],
      required: true,
    },

    designation: {
      type: String,
      trim: true,
      default: "Usthad & Class Mentor",
    },

    assignedClasses: [
      {
        type: String,
        trim: true,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    deletedAt: {
      type: Date,
    },

    deletedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;