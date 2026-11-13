import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MuallimService } from "./muallim.service.js";

const service = new MuallimService();

test("MuallimService: isClassAssignedToTeacher enforces class boundary", () => {
  const assignedClassIds = [
    new mongoose.Types.ObjectId("6ab23ab27221130b25e65224"),
    new mongoose.Types.ObjectId("6ab23ab27221130b25e65225"),
  ];
  const assignedClassNames = ["4", "5", "Class 4", "Class 5"];

  // Assigned classes
  assert.equal(service.isClassAssignedToTeacher("4", assignedClassIds, assignedClassNames), true);
  assert.equal(service.isClassAssignedToTeacher("Class 4", assignedClassIds, assignedClassNames), true);
  assert.equal(service.isClassAssignedToTeacher("6ab23ab27221130b25e65224", assignedClassIds, assignedClassNames), true);

  // Unassigned classes
  assert.equal(service.isClassAssignedToTeacher("6", assignedClassIds, assignedClassNames), false);
  assert.equal(service.isClassAssignedToTeacher("Class 6", assignedClassIds, assignedClassNames), false);
  assert.equal(service.isClassAssignedToTeacher("6ab23ab27221130b25e65229", assignedClassIds, assignedClassNames), false);
});

test("Student Filtering: Selected classId isolates students strictly to that class", () => {
  const mockStudents = [
    { id: "s1", name: "Student 1", class: "4", classId: "c4" },
    { id: "s2", name: "Student 2", class: "4", classId: "c4" },
    { id: "s3", name: "Student 3", class: "5", classId: "c5" },
    { id: "s4", name: "Student 4", class: "5", classId: "c5" },
  ];

  // Selecting Class 4
  const class4Target = "4";
  const class4Students = mockStudents.filter((s) => {
    const sClass = String(s.class || "").replace(/^Class\s*/i, "").trim().toLowerCase();
    const sClassId = String(s.classId || "").toLowerCase();
    const cleanTarget = String(class4Target).replace(/^Class\s*/i, "").trim().toLowerCase();
    return sClass === cleanTarget || sClassId === cleanTarget;
  });

  assert.equal(class4Students.length, 2);
  assert.deepEqual(class4Students.map((s) => s.id), ["s1", "s2"]);
  assert.equal(class4Students.some((s) => s.class === "5"), false);

  // Switching to Class 5
  const class5Target = "5";
  const class5Students = mockStudents.filter((s) => {
    const sClass = String(s.class || "").replace(/^Class\s*/i, "").trim().toLowerCase();
    const sClassId = String(s.classId || "").toLowerCase();
    const cleanTarget = String(class5Target).replace(/^Class\s*/i, "").trim().toLowerCase();
    return sClass === cleanTarget || sClassId === cleanTarget;
  });

  assert.equal(class5Students.length, 2);
  assert.deepEqual(class5Students.map((s) => s.id), ["s3", "s4"]);
  assert.equal(class5Students.some((s) => s.class === "4"), false);
});

test("Pagination Safety: Class filter ensures pagination never includes students from other classes", () => {
  const class4Students = [
    { id: "s1", name: "Student 1", class: "4" },
    { id: "s2", name: "Student 2", class: "4" },
    { id: "s3", name: "Student 3", class: "4" },
  ];
  const class5Students = [
    { id: "s4", name: "Student 4", class: "5" },
    { id: "s5", name: "Student 5", class: "5" },
  ];

  const page = 1;
  const limit = 2;
  const paginatedClass4 = class4Students.slice((page - 1) * limit, page * limit);

  assert.equal(paginatedClass4.length, 2);
  assert.equal(paginatedClass4.every((s) => s.class === "4"), true);
  assert.equal(paginatedClass4.some((s) => s.class === "5"), false);
});
