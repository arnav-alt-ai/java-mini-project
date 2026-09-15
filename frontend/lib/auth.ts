import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";

export type UserRole = "user" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const jwtSecret = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-only-change-this-secret"
);

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);

export const createAuthToken = (user: AuthUser) =>
  new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecret);

export const verifyAuthToken = async (token: string) => {
  const { payload } = await jwtVerify(token, jwtSecret);
  if (!payload.sub || (payload.role !== "user" && payload.role !== "admin")) {
    throw new Error("Invalid auth token");
  }

  return {
    id: payload.sub,
    name: String(payload.name || ""),
    email: String(payload.email || ""),
    role: payload.role as UserRole,
  } satisfies AuthUser;
};

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);