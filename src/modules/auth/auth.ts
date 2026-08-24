import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";
import { username } from "better-auth/plugins";

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/tharbiya";
export const mongoClient = new MongoClient(mongoURI);
const db = mongoClient.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client: mongoClient,
    transaction: false,
  }),
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "tharbiya_madrasa_super_secure_secret_key_2026_jwt_auth_production_development",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  trustedOrigins: [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 4,
  },
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "PARENT",
        input: true,
      },
      phone: {
        type: "string",
        required: false,
        defaultValue: "",
        input: true,
      },
      designation: {
        type: "string",
        required: false,
        defaultValue: "",
        input: true,
      },
      madrasaName: {
        type: "string",
        required: false,
        defaultValue: "Darunnajath Mundambra",
        input: true,
      },
      assignedClasses: {
        type: "string", // JSON stringified array
        required: false,
        defaultValue: "[]",
        input: true,
      },
      assignedSubjects: {
        type: "string",
        required: false,
        defaultValue: "[]",
        input: true,
      },
      studentIds: {
        type: "string",
        required: false,
        defaultValue: "[]",
        input: true,
      },
      avatar: {
        type: "string",
        required: false,
        defaultValue: "",
        input: true,
      },
    },
  },
});

export type Auth = typeof auth;
