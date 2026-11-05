import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });
import { issueSessionToken } from "./dist/modules/auth/sessionToken.js";

async function testHttp() {
  const teacherId = "6a8956ef0670feaf2506899f"; // Shibili Ahsani
  const token = issueSessionToken(teacherId);
  console.log("Token issued:", token);

  const payload = {
    classId: "4",
    month: 11,
    year: 2026,
    entries: [
      {
        studentId: "6ab22acd7221130b25e65201",
        practicalSubjectId: "6a9ff471187e203ea1a0d505",
        score: 4,
        remarks: "Tested via HTTP",
      },
    ],
  };

  const res = await fetch("http://localhost:5000/api/muallim/classes/4/students", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("HTTP Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Response Body:", text);
}

testHttp().catch(console.error);
