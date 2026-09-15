import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { createAuthToken, isValidEmail, verifyPassword } from "../../../../lib/auth";
import { authCookieName, authCookieOptions } from "../../../../lib/authCookie";
import { findUserByEmail } from "../../../../lib/userStore";

const attempts = new Map<string, { count: number; resetAt: number }>();
const windowMilliseconds = 15 * 60 * 1000;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = attempts.get(ip);
  if (current && current.resetAt > now && current.count >= 5) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  }
  if (!current || current.resetAt <= now) attempts.set(ip, { count: 0, resetAt: now + windowMilliseconds });
  attempts.get(ip)!.count += 1;

  let body: { email?: string; password?: string; expectedRole?: "user" | "admin" };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  const user = isValidEmail(email) ? findUserByEmail(email) : undefined;
  if (!user || !(await verifyPassword(body.password || "", user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (body.expectedRole && user.role !== body.expectedRole) {
    const roleLabel = body.expectedRole === "admin" ? "Admin" : "Citizen";
    return NextResponse.json(
      {
        error: `This account is not registered as a ${roleLabel}. Please select the correct login type.`,
      },
      { status: 403 }
    );
  }

  attempts.delete(ip);
  const token = await createAuthToken(user);
  const response = NextResponse.json({ token, role: user.role, userId: user.id });
  response.cookies.set(authCookieName, token, authCookieOptions);
  return response;
}