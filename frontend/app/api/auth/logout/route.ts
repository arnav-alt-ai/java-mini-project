import { NextResponse } from "next/server";

export const dynamic = "force-static";
import { authCookieName } from "../../../../lib/authCookie";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(authCookieName, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}