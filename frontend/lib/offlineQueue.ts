"use client";

import { useEffect, useState } from "react";

export type OfflineQueueItem = {
  id: string;
  type: "sos" | "report";
  payload: Record<string, unknown>;
  timestamp: number;
  synced: false;
};

export type LastKnownLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: number;
};

const queueKey = "lifeline:offline-queue";
const locationKey = "lifeline:last-location";
const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
let syncPromise: Promise<void> | null = null;
const retryCounts = new Map<string, number>();

const readQueue = (): OfflineQueueItem[] => {
  try {
    return JSON.parse(localStorage.getItem(queueKey) || "[]") as OfflineQueueItem[];
  } catch {
    return [];
  }
};

const writeQueue = (items: OfflineQueueItem[]) => {
  localStorage.setItem(queueKey, JSON.stringify(items));
  window.dispatchEvent(new Event("offline-queue-updated"));
};

export const getPendingCount = () => readQueue().filter((item) => !item.synced).length;

export const getLastKnownLocation = (): LastKnownLocation | null => {
  try {
    return JSON.parse(localStorage.getItem(locationKey) || "null") as LastKnownLocation | null;
  } catch {
    return null;
  }
};

export const enqueueOfflineAction = (
  type: OfflineQueueItem["type"],
  payload: Record<string, unknown>
) => {
  const item: OfflineQueueItem = {
    id: crypto.randomUUID(),
    type,
    payload: { ...payload, clientRequestId: crypto.randomUUID() },
    timestamp: Date.now(),
    synced: false,
  };
  if (isStaticDemo) return item;
  writeQueue([...readQueue(), item]);
  return item;
};

export const syncOfflineQueue = async () => {
  if (typeof window === "undefined") return;
  if (isStaticDemo) {
    if (readQueue().length > 0) writeQueue([]);
    return;
  }
  if (!navigator.onLine) return;
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const items = readQueue().sort((first, second) => first.timestamp - second.timestamp);
    for (const item of items) {
      if (!navigator.onLine) break;
      const endpoint = item.type === "sos" ? "/api/sos/trigger" : "/api/reports/submit";
      const attempt = retryCounts.get(item.id) || 0;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": String(item.payload.clientRequestId),
          },
          body: JSON.stringify(item.payload),
        });
        if (!response.ok) throw new Error(`Sync failed with status ${response.status}`);

        retryCounts.delete(item.id);
        writeQueue(readQueue().filter((queuedItem) => queuedItem.id !== item.id));
      } catch {
        const nextAttempt = attempt + 1;
        retryCounts.set(item.id, nextAttempt);
        window.setTimeout(() => void syncOfflineQueue(), Math.min(30_000, 1000 * 2 ** nextAttempt));
        break;
      }
    }
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
};

export function useOfflineSync() {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let locationWatchId: number | undefined;
    const refresh = () => {
      window.setTimeout(() => {
        setIsOffline(!navigator.onLine);
        setPendingCount(getPendingCount());
      }, 0);
    };
    const onOnline = () => {
      refresh();
      void syncOfflineQueue();
    };
    const onOffline = refresh;
    const onQueueUpdated = refresh;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (getPendingCount() > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("offline-queue-updated", onQueueUpdated);
    window.addEventListener("beforeunload", warnBeforeUnload);

    if (navigator.geolocation) {
      locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const lastLocation = getLastKnownLocation();
          if (!lastLocation || Date.now() - lastLocation.timestamp >= 30_000) {
            localStorage.setItem(
              locationKey,
              JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now(),
              } satisfies LastKnownLocation)
            );
          }
        },
        () => undefined,
        { enableHighAccuracy: true, maximumAge: 30_000 }
      );
    }

    void syncOfflineQueue();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("offline-queue-updated", onQueueUpdated);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      if (locationWatchId !== undefined) navigator.geolocation?.clearWatch(locationWatchId);
    };
  }, []);

  return { isOffline, pendingCount };
}