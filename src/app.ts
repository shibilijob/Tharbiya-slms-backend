import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";

// Modules
import { auth, authenticate, authRoutes } from "./modules/auth/index.js";
import { attendanceRoutes } from "./modules/attendance/index.js";
import { hifzRoutes } from "./modules/hifz/index.js";
import { practicalRoutes } from "./modules/practical/index.js";
import { sadhrRoutes } from "./modules/sadhr/index.js";
import { muallimRoutes } from "./modules/muallim/index.js";
import { parentRoutes } from "./modules/parent/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

// Trust reverse proxy (Render.com load balancer / TLS termination)
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "https://tharbiya-slms-frontend.vercel.app",
      "https://tharbiya-slms-frontend.vercel.app",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.use(morgan("dev"));

// 1. Mount Better Auth Handler BEFORE body parsers (preserves raw streams and headers)
app.all("/api/auth/*", toNodeHandler(auth));

// 2. Express body parsers for application API routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Attach user session to request
app.use(authenticate);

import User from "./models/User.js";

// 4. Mount Modular API Routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/hifz", hifzRoutes);
app.use("/api/practical", practicalRoutes);
app.use("/api/sadhr", sadhrRoutes);
app.use("/api/muallim", muallimRoutes);
app.use("/api/parent", parentRoutes);

// Public faculty directory for syncing assigned classes
app.get("/api/faculty-members", async (_req, res) => {
  try {
    const teachers = await User.find({
      role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
      isActive: true,
    }).select("-password");

    const mapped = teachers.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      phone: t.phone,
      email: t.email,
      role: t.role,
      designation: t.designation || (t.role === "SADHR_MUALLIM" ? "Sadhr Muallim" : "Muallim"),
      assignedClasses: t.assignedClasses || [],
      assignedSubjects: t.assignedSubjects || [],
    }));

    return res.json({
      success: true,
      data: mapped,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message });
  }
});

// Public health check endpoint
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Darunnajath Madrasa API is running",
    modules: ["auth", "attendance", "hifz", "practical", "sadhr", "muallim", "parent"],
    timestamp: new Date().toISOString(),
  });
});

// 5. Centralized Error Handling Middleware
app.use(errorHandler);

export default app;