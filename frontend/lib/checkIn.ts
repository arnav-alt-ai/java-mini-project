export type CheckInStatus = "active" | "safe" | "extended" | "missed";

export interface CheckInRecord {
  id: string;
  label: string;
  startedAt: number;
  deadline: number;
  status: CheckInStatus;
  shareLocation: boolean;
  lastUpdatedAt: number;
}

export interface CheckInHistoryItem {
  id: string;
  label: string;
  startedAt: number;
  endedAt: number;
  outcome: "completed" | "extended" | "missed";
}

export const CHECK_IN_PRESETS = [
  { label: "Walking home", minutes: 15 },
  { label: "Cab ride", minutes: 30 },
  { label: "Solo hike", minutes: 60 },
  { label: "Night shift", minutes: 120 },
  { label: "First date", minutes: 60 },
] as const;

const CHECK_IN_KEY = "lifeline:checkin";
const CHECK_IN_HISTORY_KEY = "lifeline:checkin-history";

export function getCheckInStorageKey() {
  return CHECK_IN_KEY;
}

export function getCheckInHistoryStorageKey() {
  return CHECK_IN_HISTORY_KEY;
}

export function readCheckIn(): CheckInRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CHECK_IN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckInRecord;
  } catch {
    return null;
  }
}

export function writeCheckIn(value: CheckInRecord | null) {
  if (typeof window === "undefined") return;

  if (!value) {
    window.localStorage.removeItem(CHECK_IN_KEY);
    return;
  }

  window.localStorage.setItem(CHECK_IN_KEY, JSON.stringify(value));
}

export function readCheckInHistory(): CheckInHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CHECK_IN_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as CheckInHistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCheckInHistory(items: CheckInHistoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHECK_IN_HISTORY_KEY, JSON.stringify(items));
}

export function reconcileCheckIn(checkIn: CheckInRecord | null, now = Date.now()): CheckInRecord | null {
  if (!checkIn) return null;
  if (checkIn.status !== "active") return checkIn;
  if (now <= checkIn.deadline) return checkIn;

  return {
    ...checkIn,
    status: "missed",
    lastUpdatedAt: now,
  };
}

export function extendCheckIn(deadline: number, minutes = 15, now = Date.now()) {
  const next = Math.max(deadline, now) + minutes * 60 * 1000;
  return next;
}
