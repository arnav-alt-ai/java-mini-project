import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { authCookieName } from "../../../../lib/authCookie";
import { verifyAuthToken } from "../../../../lib/auth";

export async function GET() {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true") {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const token = (await cookies()).get(authCookieName)?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    const user = await verifyAuthToken(token);
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}