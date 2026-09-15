import type { AuthUser, UserRole } from "./auth";

type StoredUser = AuthUser & { passwordHash: string };

const users = new Map<string, StoredUser>();

export const findUserByEmail = (email: string) =>
  users.get(email.trim().toLowerCase());

export const findUserById = (id: string) =>
  [...users.values()].find((user) => user.id === id);

export const createStoredUser = (user: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}) => {
  const createdUser: StoredUser = {
    id: crypto.randomUUID(),
    name: user.name,
    email: user.email.trim().toLowerCase(),
    passwordHash: user.passwordHash,
    role: user.role,
  };
  users.set(createdUser.email, createdUser);
  return createdUser;
};