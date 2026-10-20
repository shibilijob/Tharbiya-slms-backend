import test from "node:test";
import assert from "node:assert/strict";
import { issueSessionToken, verifySessionToken } from "./sessionToken.js";

test("signed application bearer token resolves its user ID", () => {
  const previous = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "unit-test-secret-with-at-least-32-characters";
  try {
    const userId = "507f1f77bcf86cd799439011";
    assert.equal(verifySessionToken(issueSessionToken(userId)), userId);
  } finally {
    if (previous === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previous;
  }
});

test("arbitrary object IDs and modified signatures are rejected", () => {
  const previous = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "unit-test-secret-with-at-least-32-characters";
  try {
    assert.equal(verifySessionToken("507f1f77bcf86cd799439011"), null);
    const token = issueSessionToken("507f1f77bcf86cd799439011");
    assert.equal(verifySessionToken(`${token.slice(0, -1)}x`), null);
  } finally {
    if (previous === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previous;
  }
});
