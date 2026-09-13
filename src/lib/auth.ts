import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  signAdminToken,
  timingSafeEqual,
} from "@/lib/auth-token";

export { ADMIN_COOKIE, signAdminToken };

export async function isAdminAuthenticated() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  const expected = await signAdminToken(password);
  return timingSafeEqual(token, expected);
}

export async function requireAdmin() {
  return isAdminAuthenticated();
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}
