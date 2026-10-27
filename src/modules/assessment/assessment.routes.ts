import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { assessmentController } from "../muallim/assessment.controller.js";

const router = Router();
const facultyRoles = ["MUALLIM", "SADHR_MUALLIM", "ADMIN"];

// Standard Assessment Mark Endpoints
router.get("/student-marks", requireAuth, requireRole(facultyRoles), assessmentController.getStudentMarks);
router.post("/student-marks/save", requireAuth, requireRole(facultyRoles), assessmentController.saveStudentMarks);

// Also re-export list/save/delete
router.get("/", requireAuth, requireRole([...facultyRoles, "PARENT"]), assessmentController.list);
router.post("/", requireAuth, requireRole(facultyRoles), assessmentController.save);
router.delete("/:id", requireAuth, requireRole(facultyRoles), assessmentController.remove);

export default router;
