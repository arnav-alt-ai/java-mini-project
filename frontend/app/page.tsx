"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { EmergencyContact } from "../lib/models";
import { buildEmergencyMessage, buildSmsLink } from "../lib/smsLink";
import {
  CHECK_IN_PRESETS,
  extendCheckIn,
  readCheckIn,
  readCheckInHistory,
  reconcileCheckIn,
  writeCheckIn,
  writeCheckInHistory,
  type CheckInHistoryItem,
  type CheckInRecord,
} from "../lib/checkIn";
import OfflineBanner from "./OfflineBanner";
import ProtectedRoute from "./ProtectedRoute";
import {
  enqueueOfflineAction,
  getLastKnownLocation,
  syncOfflineQueue,
} from "../lib/offlineQueue";

// Components
import SosHeroButton from "./components/SosHeroButton";
import RadialGauge from "./components/RadialGauge";
import AIAssistantChat from "./components/AIAssistantChat";
import SosOverlay from "./components/SosOverlay";
import BottomNavBar from "./components/BottomNavBar";

const EmergencyMap = dynamic(() => import("./Map"), { ssr: false });

type NearbyPlace = {
  id: string;
  category: "hospital" | "police" | "fire_station" | "shelter";
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
};

export default function Home() {
  const [sosActive, setSosActive] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [sosMessage, setSosMessage] = useState("");
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContact, setNewContact] = useState({ name: "", phoneNumber: "", relationship: "" });
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLocation, setNearbyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isFindingNearby, setIsFindingNearby] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const cancelledSosRef = useRef(false);

  // Check-In (Dead-Man Switch) State
  const [checkIn, setCheckIn] = useState<CheckInRecord | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<CheckInHistoryItem[]>([]);
  const [checkInLabel, setCheckInLabel] = useState("");
  const [checkInDuration, setCheckInDuration] = useState<number>(30);
  const [checkInShareLocation, setCheckInShareLocation] = useState(false);
  const [checkInRemaining, setCheckInRemaining] = useState<string>("");
  const [graceWindowOpen, setGraceWindowOpen] = useState(false);
  const missedCheckInStartedRef = useRef(false);
  const graceTimerRef = useRef<number | null>(null);

  const cancelSos = useCallback(() => {
    cancelledSosRef.current = true;
    if (countdownRef.current) {
      window.clearTimeout(countdownRef.current);
      countdownRef.current = null;
    }
    setSosActive(false);
    setCountdown(null);
    setSosMessage("");
    setLocation(null);
  }, []);

  const persistLastKnownLocation = (latitude: number, longitude: number, accuracy: number) => {
    const value = { latitude, longitude, accuracy, timestamp: Date.now() };
    localStorage.setItem("lifeline:last-location", JSON.stringify(value));
  };

  const buildLocationMessage = (latitude: number | null, longitude: number | null, accuracy: number | null) => {
    if (latitude === null || longitude === null || accuracy === null) {
      return "Location unavailable";
    }

    return `Location: https://maps.google.com/?q=${latitude},${longitude} (±${Math.max(1, Math.round(accuracy))}m)`;
  };

  const sendSos = useCallback(async (trigger: "button" | "checkin-missed" = "button") => {
    if (cancelledSosRef.current) return;

    const cachedLocation = getLastKnownLocation();
    let attemptedLatitude: number | null = null;
    let attemptedLongitude: number | null = null;
    let attemptedAccuracy: number | null = null;
    let fixSource: "gps" | "last-known" | "unknown" = "unknown";

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const position = await new Promise<GeolocationPosition | null>((resolve) => {
        const timeoutId = window.setTimeout(() => resolve(null), 8000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            window.clearTimeout(timeoutId);
            resolve(pos);
          },
          () => {
            window.clearTimeout(timeoutId);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      });

      if (position) {
        attemptedLatitude = position.coords.latitude;
        attemptedLongitude = position.coords.longitude;
        attemptedAccuracy = position.coords.accuracy;
        persistLastKnownLocation(attemptedLatitude, attemptedLongitude, attemptedAccuracy);
        fixSource = "gps";
      } else if (cachedLocation) {
        attemptedLatitude = cachedLocation.latitude;
        attemptedLongitude = cachedLocation.longitude;
        attemptedAccuracy = cachedLocation.accuracy ?? 50;
        fixSource = "last-known";
      }
    } else if (cachedLocation) {
      attemptedLatitude = cachedLocation.latitude;
      attemptedLongitude = cachedLocation.longitude;
      attemptedAccuracy = cachedLocation.accuracy ?? 50;
      fixSource = "last-known";
    }

    if (cancelledSosRef.current) return;

    const payload = {
      userId: "demo-user",
      latitude: attemptedLatitude,
      longitude: attemptedLongitude,
      emergencyType: trigger === "checkin-missed" ? "checkin-missed" : "unknown",
      contacts,
      clientRequestId: crypto.randomUUID(),
      fixSource,
      trigger,
    };

    const queueFallback = () => {
      enqueueOfflineAction("sos", payload);
      setSosMessage("No connection. SOS saved and will retry automatically.");
      void syncOfflineQueue();
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueFallback();
      const body = buildEmergencyMessage({
        name: contacts[0]?.name ?? "User",
        latitude: attemptedLatitude,
        longitude: attemptedLongitude,
        accuracy: attemptedAccuracy,
        createdAt: new Date(),
      });
      if (contacts.length > 0) {
        const numbers = contacts.map((contact) => contact.phoneNumber);
        window.location.href = buildSmsLink(numbers, body);
      }
      setLocation(buildLocationMessage(attemptedLatitude, attemptedLongitude, attemptedAccuracy));
      setCountdown(null);
      return;
    }

    try {
      const response = await fetch("/api/sos/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        success?: boolean;
        contactsNotified?: string[];
        smsConfigured?: boolean;
      };

      if (!response.ok || !result.success) {
        throw new Error("SOS request failed");
      }

      setSmsConfigured(result.smsConfigured ?? false);
      setSosMessage(
        `Alert dispatched to ${result.contactsNotified?.length ?? 0} contacts.${
          result.smsConfigured ? "" : " Direct SMS fallback is prepared."
        }`
      );
      setLocation(buildLocationMessage(attemptedLatitude, attemptedLongitude, attemptedAccuracy));
    } catch {
      const body = buildEmergencyMessage({
        name: contacts[0]?.name ?? "User",
        latitude: attemptedLatitude,
        longitude: attemptedLongitude,
        accuracy: attemptedAccuracy,
        createdAt: new Date(),
      });
      setSmsConfigured(false);
      if (contacts.length > 0) {
        const numbers = contacts.map((contact) => contact.phoneNumber);
        window.location.href = buildSmsLink(numbers, body);
      }
      queueFallback();
    } finally {
      setCountdown(null);
    }
  }, [contacts]);

  const triggerMissedCheckIn = useCallback(() => {
    if (!checkIn || missedCheckInStartedRef.current) return;
    missedCheckInStartedRef.current = true;
    setGraceWindowOpen(false);
    const updated: CheckInRecord = {
      ...checkIn,
      status: "missed",
      lastUpdatedAt: Date.now(),
    };
    if (graceTimerRef.current !== null) {
      window.clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    setCheckIn(updated);
    writeCheckIn(updated);
    setSosMessage(`Missed check-in: ${checkIn.label}. Emergency alert dispatched.`);
    setSosActive(true);
    setCountdown(null);
    void sendSos("checkin-missed");
  }, [checkIn, sendSos]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        setContacts(JSON.parse(localStorage.getItem("emergencyContacts") || "[]") as EmergencyContact[]);
      } catch {
        setContacts([]);
      }

      const activeCheckIn = reconcileCheckIn(readCheckIn());
      if (activeCheckIn) {
        setCheckIn(activeCheckIn);
        writeCheckIn(activeCheckIn);
      }
      setCheckInHistory(readCheckInHistory());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!checkIn) {
      if (graceTimerRef.current !== null) {
        window.clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      return;
    }

    const update = () => {
      const now = Date.now();
      const remainingMs = Math.max(0, checkIn.deadline - now);
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      setCheckInRemaining(`${minutes}:${String(seconds).padStart(2, "0")}`);

      if (checkIn.status !== "active") {
        if (graceTimerRef.current !== null) {
          window.clearTimeout(graceTimerRef.current);
          graceTimerRef.current = null;
        }
        setGraceWindowOpen(false);
        return;
      }

      if (now > checkIn.deadline) {
        setGraceWindowOpen(true);

        if (!missedCheckInStartedRef.current && graceTimerRef.current === null) {
          graceTimerRef.current = window.setTimeout(() => {
            triggerMissedCheckIn();
          }, 2 * 60 * 1000);
        }
      } else {
        setGraceWindowOpen(false);
        if (graceTimerRef.current !== null) {
          window.clearTimeout(graceTimerRef.current);
          graceTimerRef.current = null;
        }
      }
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(timer);
      if (graceTimerRef.current !== null) {
        window.clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
    };
  }, [checkIn, triggerMissedCheckIn]);

  const addContact = () => {
    if (contacts.length >= 3 || !newContact.name.trim() || !newContact.phoneNumber.trim()) return;
    const contact: EmergencyContact = {
      id: crypto.randomUUID(),
      userId: "demo-user",
      name: newContact.name.trim(),
      phoneNumber: newContact.phoneNumber.trim(),
      relationship: newContact.relationship.trim() || "Emergency contact",
    };
    const updatedContacts = [...contacts, contact];
    setContacts(updatedContacts);
    localStorage.setItem("emergencyContacts", JSON.stringify(updatedContacts));
    setNewContact({ name: "", phoneNumber: "", relationship: "" });
  };

  const removeContact = (id: string) => {
    const updatedContacts = contacts.filter((contact) => contact.id !== id);
    setContacts(updatedContacts);
    localStorage.setItem("emergencyContacts", JSON.stringify(updatedContacts));
  };

  const startSosFlow = () => {
    if (sosActive) return;
    cancelledSosRef.current = false;
    setSosActive(true);
    setSosMessage("Initiating emergency dispatch sequence...");
    setSmsConfigured(null);
    setCountdown(5);

    const tick = (remaining: number) => {
      if (cancelledSosRef.current) return;
      setCountdown(remaining);

      if (remaining <= 0) {
        setCountdown(null);
        void sendSos();
        return;
      }

      countdownRef.current = window.setTimeout(() => tick(remaining - 1), 1000);
    };

    tick(5);
  };

  const startCheckIn = () => {
    const now = Date.now();
    const nextCheckIn: CheckInRecord = {
      id: crypto.randomUUID(),
      label: checkInLabel.trim() || "Safety Monitor",
      startedAt: now,
      deadline: now + checkInDuration * 60 * 1000,
      status: "active",
      shareLocation: checkInShareLocation,
      lastUpdatedAt: now,
    };

    missedCheckInStartedRef.current = false;
    setCheckIn(nextCheckIn);
    writeCheckIn(nextCheckIn);
    setGraceWindowOpen(false);
  };

  const endCheckInSafely = () => {
    if (!checkIn) return;

    const nextHistory: CheckInHistoryItem = {
      id: checkIn.id,
      label: checkIn.label,
      startedAt: checkIn.startedAt,
      endedAt: Date.now(),
      outcome: "completed",
    };

    missedCheckInStartedRef.current = false;
    if (graceTimerRef.current !== null) {
      window.clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    const updatedHistory = [nextHistory, ...readCheckInHistory()].slice(0, 10);
    writeCheckInHistory(updatedHistory);
    setCheckInHistory(updatedHistory);
    setCheckIn(null);
    writeCheckIn(null);
    setGraceWindowOpen(false);
  };

  const extendCheckInWindow = () => {
    if (!checkIn) return;

    const nextDeadline = extendCheckIn(checkIn.deadline, 15, Date.now());
    const updated: CheckInRecord = {
      ...checkIn,
      deadline: nextDeadline,
      status: "extended",
      lastUpdatedAt: Date.now(),
    };
    missedCheckInStartedRef.current = false;
    setCheckIn(updated);
    writeCheckIn(updated);

    const historyEntry: CheckInHistoryItem = {
      id: updated.id,
      label: updated.label,
      startedAt: updated.startedAt,
      endedAt: Date.now(),
      outcome: "extended",
    };

    const updatedHistory = [historyEntry, ...readCheckInHistory()].slice(0, 10);
    writeCheckInHistory(updatedHistory);
    setCheckInHistory(updatedHistory);
    setGraceWindowOpen(false);
  };

  const loadNearbyHelp = async (latitude: number, longitude: number) => {
    setNearbyLocation({ latitude, longitude });

    try {
      const query = `[out:json];nwr[amenity~"hospital|police|fire_station|shelter"](around:10000,${latitude},${longitude});out center tags;`;
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: new URLSearchParams({ data: query }),
      });

      if (!response.ok) throw new Error("Nearby help search failed");

      const data = (await response.json()) as {
        elements: Array<{
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: { name?: string; amenity?: string };
        }>;
      };

      const places = data.elements
        .map((place) => {
          const placeLatitude = place.lat ?? place.center?.lat;
          const placeLongitude = place.lon ?? place.center?.lon;
          const category = place.tags?.amenity;
          if (
            placeLatitude === undefined ||
            placeLongitude === undefined ||
            !["hospital", "police", "fire_station", "shelter"].includes(category || "")
          ) {
            return null;
          }

          const latitudeDifference = (placeLatitude - latitude) * 111;
          const longitudeDifference =
            (placeLongitude - longitude) * 111 * Math.cos((latitude * Math.PI) / 180);

          return {
            id: String(place.id),
            category: category as NearbyPlace["category"],
            name: place.tags?.name || "Emergency Facility",
            latitude: placeLatitude,
            longitude: placeLongitude,
            distance: Math.sqrt(latitudeDifference ** 2 + longitudeDifference ** 2),
          };
        })
        .filter((place): place is NearbyPlace => place !== null)
        .sort((first, second) => first.distance - second.distance)
        .filter(
          (place, index, allPlaces) =>
            allPlaces.findIndex((item) => item.category === place.category) === index
        );

      setNearbyPlaces(places);
    } catch {
      alert("Unable to fetch nearby services. Please check network connection.");
    } finally {
      setIsFindingNearby(false);
    }
  };

  const findNearbyHelp = () => {
    if (!navigator.geolocation) {
      alert("Location is not supported by your browser.");
      return;
    }

    setIsFindingNearby(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        void loadNearbyHelp(latitude, longitude);
      },
      (error) => {
        if (error.code === GeolocationPositionError.TIMEOUT) {
          void loadNearbyHelp(21.1458, 79.0882);
          alert("Location timed out. Showing emergency services near the demo location.");
          return;
        }
        setIsFindingNearby(false);
        if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
          alert(
            "Location access is blocked for this site. Allow Location in your browser site settings, then try again."
          );
          return;
        }
        if (error.code === GeolocationPositionError.TIMEOUT) {
          alert("Location request timed out. Check your GPS or network connection and try again.");
          return;
        }
        alert("Your location could not be detected. Check your device location settings and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <ProtectedRoute role="user">
      <main className="app-atmosphere min-h-screen pb-28 text-white">
        <OfflineBanner />

        {/* SOS Fullscreen Overlay */}
        {sosActive && (
          <SosOverlay
            countdown={countdown}
            location={location}
            contacts={contacts}
            smsConfigured={smsConfigured}
            sosMessage={sosMessage}
            onCancel={cancelSos}
          />
        )}

        {/* Navigation / Header */}
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#070b14]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 border border-red-500/40 text-lg shadow-[0_0_15px_rgba(255,59,78,0.4)]">
                ✚
              </span>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white">
                  Lifeline <span className="text-[#FF3B4E]">AI</span>
                </h1>
                <p className="text-[11px] font-medium text-slate-400">
                  Critical Response Network
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
                <span>Dispatch Online</span>
              </div>
              <Link
                href="/dashboard"
                className="hidden md:flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                <span>📊 Command Grid</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Application Container */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          
          {/* Top Hero Grid: SOS Button & Radial Threat Gauge */}
          <section className="grid gap-6 lg:grid-cols-12 items-stretch">
            
            {/* Hero SOS Action Card */}
            <div className="glass-card relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 lg:col-span-7">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                    Priority Action Zone
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    Immediate Emergency
                  </h2>
                </div>
                <span className="rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-xs font-bold text-red-300">
                  Instant Dispatch
                </span>
              </div>

              {/* Center Hero SOS Button with 1.5s Hold */}
              <div className="my-6 flex items-center justify-center">
                <SosHeroButton
                  onTriggerSos={startSosFlow}
                  isTriggered={sosActive}
                />
              </div>

              {/* Bottom Quick Help Trigger */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-400">🛡️</span> Encrypted Medical & Location Transmission
                </span>
                <span className="font-mono text-slate-400">Hold 1.5s to prevent false alerts</span>
              </div>
            </div>

            {/* Radial Risk Level & Environmental Telemetry */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              <RadialGauge
                score={12}
                statusText="Zone Safe"
                subtitle="Local sector quiet. All emergency dispatch gateways reporting nominal status."
              />

              {/* Quick Route / Report Shortcut Banner */}
              <div className="glass-card flex items-center justify-between rounded-3xl p-5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-2xl">
                    📢
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Witnessed an incident?</h3>
                    <p className="text-xs text-slate-400">Submit a verified field report with photo & GPS</p>
                  </div>
                </div>
                <Link
                  href="/report"
                  className="shrink-0 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(255,59,78,0.3)] hover:bg-red-600 transition"
                >
                  Report →
                </Link>
              </div>
            </div>
          </section>

          {/* AI Assistant Chat Section */}
          <section className="mt-8">
            <AIAssistantChat onEscalateToSos={startSosFlow} />
          </section>

          {/* Check-In Dead-Man Switch & Emergency Contacts Grid */}
          <section className="mt-8 grid gap-6 md:grid-cols-2">
            
            {/* Safety Check-in (Dead-Man Switch) */}
            <div className="glass-card flex flex-col justify-between rounded-3xl p-6">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">⏱️</span>
                    <div>
                      <h3 className="font-bold text-white text-base">Safety Check-In</h3>
                      <p className="text-xs text-slate-400">Automated dead-man response switch</p>
                    </div>
                  </div>
                  {checkIn && (
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                      Active: {checkInRemaining || "Tracking"}
                    </span>
                  )}
                </div>

                {!checkIn ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Activity Description
                      </label>
                      <input
                        value={checkInLabel}
                        onChange={(e) => setCheckInLabel(e.target.value)}
                        placeholder="e.g. Walking home from metro / Solo transit"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Duration Presets
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CHECK_IN_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setCheckInDuration(preset.minutes);
                              setCheckInLabel(preset.label);
                            }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              checkInDuration === preset.minutes
                                ? "bg-cyan-500 text-slate-950 shadow-md"
                                : "border border-white/10 bg-slate-900/80 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={checkInShareLocation}
                        onChange={(e) => setCheckInShareLocation(e.target.checked)}
                        className="h-4 w-4 rounded bg-slate-900 accent-cyan-500"
                      />
                      <span>Share live background coordinates until complete</span>
                    </label>

                    <button
                      type="button"
                      onClick={startCheckIn}
                      className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:from-cyan-500 hover:to-blue-500 active:scale-98"
                    >
                      Start Monitored Timer
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-amber-300 font-bold uppercase">Active Session</p>
                          <p className="text-base font-bold text-white">{checkIn.label}</p>
                        </div>
                        <div className="text-2xl font-mono font-black text-amber-400">
                          {checkInRemaining}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-300">
                        If time expires and grace period passes, emergency contacts receive instant SOS broadcast.
                      </p>
                    </div>

                    {graceWindowOpen && (
                      <div className="rounded-2xl border border-red-500/40 bg-red-500/20 p-3.5 text-xs text-red-200 animate-pulse">
                        ⚠️ <strong>Grace Period Active:</strong> Are you safe? Confirm immediately before automated SOS triggers.
                      </div>
                    )}

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={extendCheckInWindow}
                        className="flex-1 rounded-xl border border-white/10 bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                      >
                        +15 Min Extension
                      </button>
                      <button
                        type="button"
                        onClick={endCheckInSafely}
                        className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                      >
                        ✓ I Am Safe
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* History Preview */}
              {checkInHistory.length > 0 && (
                <div className="mt-6 border-t border-white/[0.08] pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Recent Safety Logs
                  </p>
                  <div className="space-y-1.5">
                    {checkInHistory.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300"
                      >
                        <span>{item.label}</span>
                        <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                          {item.outcome}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Contacts Management */}
            <div className="glass-card flex flex-col justify-between rounded-3xl p-6">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">👥</span>
                    <div>
                      <h3 className="font-bold text-white text-base">Emergency Contacts</h3>
                      <p className="text-xs text-slate-400">Automatic recipients during emergency</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-800 border border-white/10 px-2.5 py-0.5 text-xs font-bold text-slate-300">
                    {contacts.length}/3 Slots
                  </span>
                </div>

                {/* Contact List */}
                <div className="mt-4 space-y-2.5">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-white">{contact.name}</p>
                        <p className="text-slate-400">
                          {contact.relationship} • {contact.phoneNumber}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`tel:${contact.phoneNumber}`}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 hover:bg-emerald-500/20 font-semibold"
                        >
                          Call
                        </a>
                        <button
                          type="button"
                          onClick={() => removeContact(contact.id)}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-red-300 hover:bg-red-500/20"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-slate-400">
                      No contacts added. Register up to 3 trusted guardians.
                    </div>
                  )}
                </div>

                {/* Add Contact Form */}
                {contacts.length < 3 && (
                  <div className="mt-4 space-y-2 border-t border-white/[0.08] pt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Add Trusted Guardian
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        value={newContact.name}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                        placeholder="Full Name"
                        className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                      />
                      <input
                        type="tel"
                        value={newContact.phoneNumber}
                        onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })}
                        placeholder="Phone Number"
                        className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                      />
                      <input
                        value={newContact.relationship}
                        onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                        placeholder="Relationship (e.g. Spouse)"
                        className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addContact}
                      className="w-full rounded-xl bg-slate-800 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                    >
                      + Save Emergency Contact
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Nearby Emergency Services Map Section */}
          <section id="nearby-help" className="mt-8 glass-card rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-2xl">
                  📍
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Nearby Emergency Services</h3>
                  <p className="text-xs text-slate-400">Hospitals, police stations, fire rescue & safe shelters</p>
                </div>
              </div>

              <button
                type="button"
                onClick={findNearbyHelp}
                disabled={isFindingNearby}
                className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition shadow-lg active:scale-95 disabled:opacity-50"
              >
                <span>{isFindingNearby ? "📡 Scanning Grid..." : "📍 Locate Nearest Help"}</span>
              </button>
            </div>

            {/* Map Canvas */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
              <EmergencyMap />
            </div>

            {/* Found Places List */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {nearbyPlaces.length > 0 ? (
                nearbyPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-4 transition hover:border-cyan-400/40"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <span className="text-2xl">
                          {place.category === "hospital"
                            ? "🏥"
                            : place.category === "police"
                            ? "👮"
                            : place.category === "fire_station"
                            ? "🚒"
                            : "🏠"}
                        </span>
                        <div>
                          <h4 className="font-bold text-white text-sm">{place.name}</h4>
                          <p className="text-xs text-slate-400 capitalize">
                            {place.category.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400 font-mono">
                        {place.distance.toFixed(1)} km
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!nearbyLocation) return;
                        const origin = `${nearbyLocation.latitude},${nearbyLocation.longitude}`;
                        const dest = `${place.latitude},${place.longitude}`;
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                            origin
                          )}&destination=${encodeURIComponent(dest)}&travelmode=driving`,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                      className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/90 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                    >
                      <span>🧭 Start Emergency Route</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-2xl bg-slate-950/50 p-6 text-center text-xs text-slate-400">
                  Tap <strong>“Locate Nearest Help”</strong> above to query live verified medical and police telemetry within a 10km radius.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Mobile-First Bottom Navigation Bar with Raised SOS FAB */}
        <BottomNavBar
          onSosClick={startSosFlow}
          onAssistantClick={() => {
            document.getElementById("lifeline-chat")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </main>
    </ProtectedRoute>
  );
}