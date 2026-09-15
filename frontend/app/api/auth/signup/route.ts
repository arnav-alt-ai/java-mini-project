import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { createAuthToken, hashPassword, isValidEmail } from "../../../../lib/auth";
import { authCookieName, authCookieOptions } from "../../../../lib/authCookie";
import { createStoredUser, findUserByEmail } from "../../../../lib/userStore";

export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string; role?: string; inviteCode?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";
  if (!name || !isValidEmail(email) || password.length < 8) {
    return NextResponse.json(
      { error: "Name, valid email, and a password of at least 8 characters are required" },
      { status: 400 }
    );
  }
  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  if (body.role !== undefined && body.role !== "user" && body.role !== "admin") {
    return NextResponse.json({ error: "Invalid account role" }, { status: 400 });
  }

  const requestedAdmin = body.role === "admin";
  const hasAdminInvite =
    typeof body.inviteCode === "string" &&
    body.inviteCode.length > 0 &&
    body.inviteCode === process.env.ADMIN_INVITE_CODE;
  if (requestedAdmin && !hasAdminInvite) {
    return NextResponse.json({ error: "Admin accounts require a valid invite code" }, { status: 403 });
  }

  const user = createStoredUser({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: requestedAdmin ? "admin" : "user",
  });
  const token = await createAuthToken(user);
  const response = NextResponse.json({ token, role: user.role, userId: user.id });
  response.cookies.set(authCookieName, token, authCookieOptions);
  return response;
}