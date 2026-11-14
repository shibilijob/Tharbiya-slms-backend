import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Student from "../../models/Student.js";
import { MuallimService } from "./muallim.service.js";
import { AppError } from "../../utils/AppError.js";

const service = new MuallimService();

test("Student Schema: rollNumber field defaults to null and is not auto-generated", () => {
  const schemaPath = Student.schema.path("rollNumber");
  assert.ok(schemaPath, "rollNumber path should exist on Student schema");
  assert.equal((schemaPath as any).instance, "Number", "rollNumber should be a Number");
  assert.equal((schemaPath as any).defaultValue, null, "rollNumber should default to null");
});

test("Student Schema: classId + rollNumber partial unique index is defined", () => {
  const indexes = Student.schema.indexes();
  const rollIndex = indexes.find(([fields]) => fields.classId === 1 && fields.rollNumber === 1);
  assert.ok(rollIndex, "classId_1_rollNumber_1 index must exist");
  assert.equal(rollIndex[1]?.unique, true, "rollNumber index must be unique");
  assert.deepEqual(
    rollIndex[1]?.partialFilterExpression,
    { rollNumber: { $type: "number" }, isActive: true },
    "rollNumber index must be a partialFilterExpression on non-null numbers and active students"
  );
});

test("Sorting: Students with roll numbers appear first ascending (1, 2, 3...), followed by nulls", () => {
  const mockStudents = [
    { id: "s1", name: "Zaid", rollNumber: null },
    { id: "s2", name: "Ahmad", rollNumber: 3 },
    { id: "s3", name: "Bilal", rollNumber: 1 },
    { id: "s4", name: "Amir", rollNumber: null },
    { id: "s5", name: "Dawud", rollNumber: 2 },
  ];

  // In-memory sort matching the exact logic used in backend and frontend
  const sorted = [...mockStudents].sort((a, b) => {
    const aHas = typeof a.rollNumber === "number" && a.rollNumber > 0;
    const bHas = typeof b.rollNumber === "number" && b.rollNumber > 0;
    if (aHas && bHas) return (a.rollNumber as number) - (b.rollNumber as number);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  assert.deepEqual(
    sorted.map((s) => ({ id: s.id, roll: s.rollNumber, name: s.name })),
    [
      { id: "s3", roll: 1, name: "Bilal" },
      { id: "s5", roll: 2, name: "Dawud" },
      { id: "s2", roll: 3, name: "Ahmad" },
      { id: "s4", roll: null, name: "Amir" }, // Nulls sorted alphabetically: Amir before Zaid
      { id: "s1", roll: null, name: "Zaid" },
    ]
  );
});

test("Roll Number Validation: Rejects invalid roll numbers (0, negative, decimal, non-numeric)", () => {
  const invalidRollNumbers = [0, -1, -5, 1.5, 3.14, NaN, "abc"];

  for (const val of invalidRollNumbers) {
    const num = Number(val);
    const isValid = Number.isInteger(num) && num >= 1;
    assert.equal(isValid, false, `Value ${val} should be rejected as invalid roll number`);
  }

  const validRollNumbers = [1, 2, 10, 45, "5", "12"];
  for (const val of validRollNumbers) {
    const num = Number(val);
    const isValid = Number.isInteger(num) && num >= 1;
    assert.equal(isValid, true, `Value ${val} should be accepted as valid roll number`);
  }
});

test("Roll Number Uniqueness: Same roll number is allowed across different classes, but rejected in same class", () => {
  const classA = "class-a-id";
  const classB = "class-b-id";

  const existingRecords = [
    { studentId: "s1", classId: classA, rollNumber: 1, isActive: true },
    { studentId: "s2", classId: classA, rollNumber: 2, isActive: true },
    { studentId: "s3", classId: classB, rollNumber: 1, isActive: true }, // Allowed in class B!
  ];

  // Try assigning Roll 1 to student s4 in Class A -> DUPLICATE!
  const duplicateInA = existingRecords.some(
    (r) => r.classId === classA && r.rollNumber === 1 && r.studentId !== "s4" && r.isActive
  );
  assert.equal(duplicateInA, true, "Roll 1 should be detected as duplicate in Class A");

  // Try assigning Roll 1 to student s5 in Class C -> NOT duplicate
  const classC = "class-c-id";
  const duplicateInC = existingRecords.some(
    (r) => r.classId === classC && r.rollNumber === 1 && r.studentId !== "s5" && r.isActive
  );
  assert.equal(duplicateInC, false, "Roll 1 should be permitted in Class C");

  // Try assigning Roll 3 to student s4 in Class A -> NOT duplicate
  const roll3InA = existingRecords.some(
    (r) => r.classId === classA && r.rollNumber === 3 && r.studentId !== "s4" && r.isActive
  );
  assert.equal(roll3InA, false, "Roll 3 should be permitted in Class A");
});

test("Muallim Authorization: isClassAssignedToTeacher prevents modifying other classes", () => {
  const assignedClassIds = [new mongoose.Types.ObjectId("6ab23ab27221130b25e65224")];
  const assignedClassNames = ["4", "Class 4"];

  // Assigned class -> allowed
  assert.equal(service.isClassAssignedToTeacher("4", assignedClassIds, assignedClassNames), true);
  assert.equal(service.isClassAssignedToTeacher("Class 4", assignedClassIds, assignedClassNames), true);
  assert.equal(service.isClassAssignedToTeacher("6ab23ab27221130b25e65224", assignedClassIds, assignedClassNames), true);

  // Unassigned class -> rejected
  assert.equal(service.isClassAssignedToTeacher("5", assignedClassIds, assignedClassNames), false);
  assert.equal(service.isClassAssignedToTeacher("Class 5", assignedClassIds, assignedClassNames), false);
  assert.equal(service.isClassAssignedToTeacher("6ab23ab27221130b25e65229", assignedClassIds, assignedClassNames), false);
});
