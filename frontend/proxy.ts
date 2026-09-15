import { NextRequest, NextResponse } from "next/server";
import { authCookieName } from "./lib/authCookie";
import { verifyAuthToken } from "./lib/auth";

const publicPaths = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === "/signup" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(authCookieName)?.value;
  let user;
  try {
    user = token ? await verifyAuthToken(token) : null;
  } catch {
    user = null;
  }

  if (!user) {
    if (publicPaths.includes(pathname)) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname === "/login") {
    return NextResponse.redirect(new URL(user.role === "admin" ? "/dashboard" : "/", request.url));
  }
  if (pathname.startsWith("/admin") && user.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname === "/" || pathname.startsWith("/dashboard") || pathname.startsWith("/report")) {
    if (user.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};