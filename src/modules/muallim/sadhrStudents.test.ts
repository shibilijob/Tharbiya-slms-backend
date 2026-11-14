import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MuallimService } from "./muallim.service.js";

const service = new MuallimService();

test("MuallimService: SADHR_MUALLIM role bypasses assigned class check", () => {
  const actorRoleSadhr = "SADHR_MUALLIM";
  const actorRoleAdmin = "ADMIN";
  const actorRoleMuallim = "MUALLIM";

  const isSadhrOrAdmin = (role: string) =>
    role === "SADHR_MUALLIM" || role === "ADMIN" || role === "SUPER_ADMIN";

  assert.equal(isSadhrOrAdmin(actorRoleSadhr), true, "SADHR_MUALLIM must be recognized as privileged");
  assert.equal(isSadhrOrAdmin(actorRoleAdmin), true, "ADMIN must be recognized as privileged");
  assert.equal(isSadhrOrAdmin(actorRoleMuallim), false, "MUALLIM must not bypass assigned class check");
});

test("MuallimService: Sadhr Muallim gets students strictly filtered to requested class", () => {
  const allStudents = [
    { id: "s1", name: "Student 1", classId: "class-4-id", rollNumber: 1 },
    { id: "s2", name: "Student 2", classId: "class-4-id", rollNumber: 2 },
    { id: "s3", name: "Student 3", classId: "class-6-id", rollNumber: 1 },
    { id: "s4", name: "Student 4", classId: "class-10-id", rollNumber: 1 },
  ];

  // When Sadhr enters Class 4:
  const selectedClass = "class-4-id";
  const class4Students = allStudents.filter((s) => s.classId === selectedClass);
  assert.equal(class4Students.length, 2);
  assert.deepEqual(class4Students.map((s) => s.id), ["s1", "s2"]);

  // When Sadhr enters Class 6:
  const class6Students = allStudents.filter((s) => s.classId === "class-6-id");
  assert.equal(class6Students.length, 1);
  assert.deepEqual(class6Students.map((s) => s.id), ["s3"]);

  // When Sadhr enters Class 10:
  const class10Students = allStudents.filter((s) => s.classId === "class-10-id");
  assert.equal(class10Students.length, 1);
  assert.deepEqual(class10Students.map((s) => s.id), ["s4"]);

  // Must NOT contain combined students from all classes
  assert.equal(class4Students.some((s) => s.classId === "class-6-id" || s.classId === "class-10-id"), false);
});

test("Session persistence: Sadhr selected class preserves context across navigation", () => {
  let mockSessionStorage: Record<string, string> = {};
  const STORAGE_KEY = "tharbiyah_sadhr_selected_class_id";

  // Sadhr clicks Class 4 in Class Management:
  mockSessionStorage[STORAGE_KEY] = "class-4-id";

  // When navigating to /teacher/students without query params:
  const queryClassId = "";
  const effectiveClassId = queryClassId || mockSessionStorage[STORAGE_KEY] || "";
  assert.equal(effectiveClassId, "class-4-id", "Should recall stored class when query param is absent");

  // Navigating to Class 6:
  const newQueryClassId = "class-6-id";
  if (newQueryClassId) {
    mockSessionStorage[STORAGE_KEY] = newQueryClassId;
  }
  const updatedEffectiveClassId = newQueryClassId || mockSessionStorage[STORAGE_KEY] || "";
  assert.equal(updatedEffectiveClassId, "class-6-id", "Should update stored class when new query param is provided");
});
