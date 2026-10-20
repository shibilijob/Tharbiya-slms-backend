import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters to issue bearer sessions");
  return value;
};

export const issueSessionToken = (userId: string): string => {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `tharbiya.${payload}.${signature}`;
};

export const verifySessionToken = (token: string): string | null => {
  const match = /^tharbiya\.([a-f\d]{24})\.(\d{10})\.([\w-]+)$/i.exec(token);
  if (!match || !process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) return null;
  const [, userId, expiresAt, signature] = match;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;
  const payload = `${userId}.${expiresAt}`;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, "base64url"); } catch { return null; }
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? userId : null;
};
