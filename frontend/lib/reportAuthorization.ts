import type { UserRole } from "./auth";

export const adminReportsStatusForRole = (role: UserRole | null) => {
  if (!role) return 401;
  return role === "admin" ? 200 : 403;
};