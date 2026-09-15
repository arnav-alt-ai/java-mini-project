export type ClientRole = "user" | "admin";

type ClientUser = {
  id: string;
  name: string;
  email: string;
  role: ClientRole;
};

type StoredAccount = ClientUser & { password: string };

const accountKey = "lifeline.accounts";
const sessionKey = "lifeline.session";

const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

const readAccounts = (): StoredAccount[] => {
  try {
    return JSON.parse(window.localStorage.getItem(accountKey) || "[]") as StoredAccount[];
  } catch {
    return [];
  }
};

const saveSession = (user: ClientUser) => {
  window.localStorage.setItem(sessionKey, JSON.stringify(user));
};

export const getStoredSession = (): ClientUser | null => {
  try {
    return JSON.parse(window.localStorage.getItem(sessionKey) || "null") as ClientUser | null;
  } catch {
    return null;
  }
};

export const signInWithBrowser = (email: string, password: string, role: ClientRole) => {
  const account = readAccounts().find(
    (candidate) => candidate.email === email.trim().toLowerCase() && candidate.password === password
  );
  if (!account || account.role !== role) {
    throw new Error("Invalid email, password, or account type.");
  }
  const user: ClientUser = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
  };
  saveSession(user);
  return user;
};

export const signUpWithBrowser = (account: {
  name: string;
  email: string;
  password: string;
  role: ClientRole;
  inviteCode?: string;
}) => {
  const email = account.email.trim().toLowerCase();
  const accounts = readAccounts();
  if (accounts.some((candidate) => candidate.email === email)) {
    throw new Error("An account with this email already exists.");
  }
  if (account.role === "admin" && account.inviteCode !== "LIFELINE-ADMIN") {
    throw new Error("Use the demo admin invite code LIFELINE-ADMIN.");
  }

  const storedAccount: StoredAccount = {
    id: crypto.randomUUID(),
    name: account.name.trim(),
    email,
    password: account.password,
    role: account.role,
  };
  window.localStorage.setItem(accountKey, JSON.stringify([...accounts, storedAccount]));
  const user: ClientUser = {
    id: storedAccount.id,
    name: storedAccount.name,
    email: storedAccount.email,
    role: storedAccount.role,
  };
  saveSession(user);
  return user;
};

export const shouldUseBrowserAuth = () => isStaticDemo;
