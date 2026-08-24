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

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
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

// 1. Mount Better Auth handler BEFORE express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

// 2. Express body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Attach user session to request
app.use(authenticate);

// 4. Mount Modular API Routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/hifz", hifzRoutes);
app.use("/api/practical", practicalRoutes);
app.use("/api/sadhr", sadhrRoutes);
app.use("/api/muallim", muallimRoutes);
app.use("/api/parent", parentRoutes);

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