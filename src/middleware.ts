import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, signAdminToken, timingSafeEqual } from "@/lib/auth-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!password || !token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const expected = await signAdminToken(password);
  if (!timingSafeEqual(token, expected)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
