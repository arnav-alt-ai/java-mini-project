"use client";

import { useOfflineSync } from "../lib/offlineQueue";

export default function OfflineBanner() {
  const { isOffline, pendingCount } = useOfflineSync();

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      className={`fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full border px-4 py-2 text-sm shadow-xl ${
        isOffline
          ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-100"
          : "border-blue-400/30 bg-blue-400/10 text-blue-100"
      }`}
    >
      {isOffline ? "⚠ Offline" : "Syncing queued alerts"} — {pendingCount} alerts pending sync.
    </div>
  );
}