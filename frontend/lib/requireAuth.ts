import { cookies } from "next/headers";
import { authCookieName } from "./authCookie";
import { verifyAuthToken, type AuthUser } from "./auth";

export async function getRequestUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(authCookieName)?.value;
  if (!token) return null;

  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}