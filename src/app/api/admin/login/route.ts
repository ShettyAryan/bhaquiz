import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, signAdminToken } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return jsonError("Admin password is not configured on the server.", 500);
  }

  let body: { password?: string } | null = null;
  try {
    body = parseJson<{ password?: string }>(await request.json());
  } catch {
    return jsonError("Invalid request.");
  }

  const submitted = body?.password ?? "";
  if (!submitted) return jsonError("Enter the admin password.");

  const expected = await signAdminToken(password);
  const received = await signAdminToken(submitted);
  if (expected !== received) {
    return jsonError("Incorrect password.", 401);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, expected, adminCookieOptions());
  return response;
}
