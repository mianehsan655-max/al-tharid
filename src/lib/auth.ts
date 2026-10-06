import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "altharid_admin";

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Set SESSION_SECRET to at least 32 characters in .env.local");
  return secret;
}

function sign(value: string) { return createHmac("sha256", key()).update(value).digest("hex"); }

export function validPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 16 || !process.env.SESSION_SECRET) return false;
  const a = Buffer.from(input), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startSession() {
  const expiry = String(Date.now() + 12 * 60 * 60 * 1000);
  (await cookies()).set(cookieName, `${expiry}.${sign(expiry)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 });
}

export async function isAdmin() {
  const raw = (await cookies()).get(cookieName)?.value ?? "";
  const [expiry, signature, extra] = raw.split(".");
  if (!expiry || !signature || extra || !/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  const expected = Buffer.from(sign(expiry)), received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

export async function endSession() { (await cookies()).delete(cookieName); }
