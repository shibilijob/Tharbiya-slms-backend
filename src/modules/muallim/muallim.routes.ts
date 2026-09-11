import { Router } from "express";
import { muallimController } from "./muallim.controller.js";
import { practicalController } from "../practical/practical.controller.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";

const router = Router();

const facultyRoles = ["MUALLIM", "SADHR_MUALLIM"];

/**
 * Muallim Dashboard & Classroom
 */
router.get("/dashboard", requireAuth, requireRole(facultyRoles), muallimController.getDashboard);
router.get("/classes", requireAuth, requireRole(facultyRoles), muallimController.getAssignedClasses);
router.get(
  "/classes/:classId/students",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getClassStudents
);

/**
 * Attendance Operations
 */
router.post(
  "/attendance/mark",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.markAttendance
);
router.get("/attendance/class/:classId", requireAuth, requireRole(facultyRoles), muallimController.getClassAttendance);
router.get("/attendance/student/:studentId", requireAuth, requireRole(facultyRoles), muallimController.getStudentAttendance);

/**
 * Hifz / Quran Memorization & Recitation Operations
 */
router.get("/hifz/student/:studentId", requireAuth, requireRole(facultyRoles), muallimController.getStudentHifzHistory);
router.get(
  "/hifz/student/:studentId/summary",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getStudentHifzSummary
);

/**
 * Practical & Adab Score Operations
 */
router.post(
  "/practical/evaluate",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.recordPracticalEvaluation
);
router.get("/practical/student/:studentId", requireAuth, requireRole(facultyRoles), muallimController.getStudentEvaluations);
router.get(
  "/practical/student/:studentId/report",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getStudentPracticalReport
);

/**
 * Month-Wise Practical Scores Operations
 */
router.post(
  "/practical-scores",
  requireAuth,
  requireRole(facultyRoles),
  practicalController.recordMonthlyScore
);
router.post(
  "/practical-scores/bulk",
  requireAuth,
  requireRole(facultyRoles),
  practicalController.recordBulkMonthlyScores
);
router.get(
  "/practical-scores",
  requireAuth,
  requireRole(facultyRoles),
  practicalController.getMonthlyScores
);
router.get(
  "/practical-scores/history",
  requireAuth,
  practicalController.getStudentMonthlyHistory
);
router.get(
  "/practical-scores/student/:studentId/history",
  requireAuth,
  practicalController.getStudentMonthlyHistory
);
router.delete(
  "/practical-scores/:id",
  requireAuth,
  requireRole(facultyRoles),
  practicalController.deleteMonthlyScore
);

/**
 * Practical Subject Management Operations (Add, List, Update, Remove)
 */
router.post(
  "/practical-subjects",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.addPracticalSubject
);
router.get(
  "/practical-subjects",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getPracticalSubjects
);
router.get(
  "/practical-subjects/class/:classId",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getPracticalSubjects
);
router.get(
  "/practical-subjects/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getPracticalSubjectById
);
router.patch(
  "/practical-subjects/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.updatePracticalSubject
);
router.put(
  "/practical-subjects/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.updatePracticalSubject
);
router.delete(
  "/practical-subjects/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.removePracticalSubject
);

/**
 * Academic Subject Management Operations (Add, List, Edit/Update, Remove)
 */
router.post(
  "/subjects",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.addSubject
);
router.get(
  "/subjects",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getSubjects
);
router.get(
  "/subjects/class/:classId",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getSubjects
);
router.get(
  "/subjects/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getSubjectById
);
router.patch(
  "/subjects/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.updateSubject
);
router.put(
  "/subjects/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.updateSubject
);
router.delete(
  "/subjects/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.removeSubject
);

/**
 * Awards & Achievements Operations (Create, Delete/Remove, Query)
 */
router.post(
  "/achievements",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.createAchievement
);
router.post(
  "/awards",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.createAchievement
);
router.get(
  "/achievements",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getAchievements
);
router.get(
  "/awards",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getAchievements
);
router.get(
  "/achievements/student/:studentId",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getAchievements
);
router.get(
  "/awards/student/:studentId",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getAchievements
);
router.get(
  "/achievements/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getAchievementById
);
router.get(
  "/awards/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getAchievementById
);
router.delete(
  "/achievements/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.deleteAchievement
);
router.delete(
  "/awards/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.deleteAchievement
);

/**
 * Timetable & Period Management Operations (Add, Edit/Update, Delete, Query)
 */
router.post(
  "/timetable/periods",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.addPeriod
);
router.get(
  "/timetable/periods",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getPeriods
);
router.get(
  "/timetable/periods/class/:classId",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getPeriods
);
router.get(
  "/timetable/periods/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.getPeriodById
);
router.patch(
  "/timetable/periods/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.updatePeriod
);
router.put(
  "/timetable/periods/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.updatePeriod
);
router.delete(
  "/timetable/periods/:id",
  requireAuth,
  requireRole(facultyRoles),
  muallimController.deletePeriod
);

export default router;




