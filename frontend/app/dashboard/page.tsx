"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import ProtectedRoute from "../ProtectedRoute";

type Emergency = {
  id: string | number;
  type: string;
  location: string;
  description: string;
  photo?: string;
  status: "Active" | "Responding" | "Resolved";
  time: string;
  severity?: "Critical" | "High" | "Moderate";
};

type Hospital = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
};

type ResponderUnit = {
  id: string;
  callsign: string;
  type: "Ambulance" | "Police" | "Fire" | "Rescue";
  status: "En Route" | "On Scene" | "Available" | "Standby";
  eta: string;
  assignedIncidentId?: string | number;
};

const demoData: Emergency[] = [
  {
    id: "inc-1",
    type: "Medical Emergency",
    severity: "Critical",
    location: "Sector 4, Central Corridor",
    description: "Pedestrian struck by vehicle, patient unresponsive with head trauma.",
    status: "Active",
    time: "2m ago",
  },
  {
    id: "inc-2",
    type: "Fire Emergency",
    severity: "Critical",
    location: "Civil Lines Industrial Park",
    description: "Structural fire reported in warehouse block 3. Black smoke visible.",
    status: "Responding",
    time: "8m ago",
  },
  {
    id: "inc-3",
    type: "Traffic Accident",
    severity: "High",
    location: "Outer Ring Expressway Exit 12",
    description: "Multi-vehicle rear collision blocking 2 lanes. No trapped victims.",
    status: "Responding",
    time: "14m ago",
  },
  {
    id: "inc-4",
    type: "Crime or Security Emergency",
    severity: "Moderate",
    location: "Transit Hub Station East",
    description: "Suspicious unattended package reported on platform.",
    status: "Resolved",
    time: "32m ago",
  },
];

const INITIAL_RESPONDERS: ResponderUnit[] = [
  { id: "u-1", callsign: "Medic Unit 04", type: "Ambulance", status: "En Route", eta: "3 min", assignedIncidentId: "inc-1" },
  { id: "u-2", callsign: "Fire Engine 11", type: "Fire", status: "On Scene", eta: "On Site", assignedIncidentId: "inc-2" },
  { id: "u-3", callsign: "Patrol Car 28", type: "Police", status: "En Route", eta: "5 min", assignedIncidentId: "inc-3" },
  { id: "u-4", callsign: "Heavy Rescue 02", type: "Rescue", status: "Available", eta: "Standby" },
  { id: "u-5", callsign: "Medic Unit 09", type: "Ambulance", status: "Available", eta: "Standby" },
];

let cachedStorageValue: string | null | undefined;
let cachedEmergencies = demoData;

const getEmergencies = (): Emergency[] => {
  if (typeof window === "undefined") return demoData;

  const savedReports = window.localStorage.getItem("emergencies");
  if (savedReports === cachedStorageValue) return cachedEmergencies;

  if (savedReports) {
    try {
      cachedEmergencies = JSON.parse(savedReports) as Emergency[];
    } catch {
      cachedEmergencies = demoData;
    }
  } else {
    window.localStorage.setItem("emergencies", JSON.stringify(demoData));
    cachedEmergencies = demoData;
  }

  cachedStorageValue = savedReports;
  return cachedEmergencies;
};

const subscribeToEmergencies = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener("emergencies-updated", onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("emergencies-updated", onChange);
  };
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "incidents" | "routes" | "responders">("dashboard");
  const [incidentFilter, setIncidentFilter] = useState<"all" | "Active" | "Responding" | "Resolved">("all");
  const [currentLocation, setCurrentLocation] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [patientCondition, setPatientCondition] = useState("Critical");
  const [routeAnalysis, setRouteAnalysis] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [hospitalError, setHospitalError] = useState("");
  const [responders] = useState<ResponderUnit[]>(INITIAL_RESPONDERS);

  const emergencies = useSyncExternalStore(
    subscribeToEmergencies,
    getEmergencies,
    () => demoData
  );

  const updateStatus = (
    id: string | number,
    newStatus: "Active" | "Responding" | "Resolved"
  ) => {
    const updated = emergencies.map((emergency) =>
      emergency.id === id ? { ...emergency, status: newStatus } : emergency
    );

    localStorage.setItem("emergencies", JSON.stringify(updated));
    window.dispatchEvent(new Event("emergencies-updated"));
  };

  const activeCount = emergencies.filter((e) => e.status === "Active").length;
  const respondingCount = emergencies.filter((e) => e.status === "Responding").length;
  const resolvedCount = emergencies.filter((e) => e.status === "Resolved").length;

  const filteredEmergencies = emergencies.filter((e) => {
    if (incidentFilter === "all") return true;
    return e.status === incidentFilter;
  });

  const startNavigation = () => {
    if (!selectedHospital) {
      alert("Detect your location and select a hospital first.");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    const navigationWindow = window.open("about:blank", "_blank");
    if (!navigationWindow) {
      alert("Please allow pop-ups to start navigation.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const origin = `${latitude},${longitude}`;
        const destination = `${selectedHospital.latitude},${selectedHospital.longitude}`;

        setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setIsLocating(false);
        navigationWindow.location.href = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
          origin
        )}&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate`;
      },
      () => {
        setIsLocating(false);
        navigationWindow.close();
        alert("Please allow location permission to start navigation.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const findNearbyHospitals = async (latitude: number, longitude: number) => {
    const query = `[out:json];(nwr[amenity=hospital](around:10000,${latitude},${longitude});nwr[healthcare=hospital](around:10000,${latitude},${longitude}););out center tags;`;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: query }),
    });

    if (!response.ok) throw new Error("Hospital search failed");

    const data = (await response.json()) as {
      elements: Array<{
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: { name?: string };
      }>;
    };

    const nearby = data.elements
      .map((place) => {
        const placeLatitude = place.lat ?? place.center?.lat;
        const placeLongitude = place.lon ?? place.center?.lon;
        if (placeLatitude === undefined || placeLongitude === undefined) return null;

        const latitudeDifference = (placeLatitude - latitude) * 111;
        const longitudeDifference =
          (placeLongitude - longitude) * 111 * Math.cos((latitude * Math.PI) / 180);

        return {
          id: String(place.id),
          name: place.tags?.name || "Emergency Medical Hospital",
          latitude: placeLatitude,
          longitude: placeLongitude,
          distance: Math.sqrt(latitudeDifference ** 2 + longitudeDifference ** 2),
        };
      })
      .filter((place): place is Hospital => place !== null)
      .sort((first, second) => first.distance - second.distance)
      .slice(0, 3);

    setHospitals(nearby);
    setSelectedHospital(nearby[0] ?? null);
    setHospitalError(nearby.length === 0 ? "No hospitals found within 10 km." : "");
  };

  return (
    <ProtectedRoute role="admin">
      <main className="app-atmosphere min-h-screen text-white flex flex-col lg:flex-row">
        
        {/* DESKTOP-FIRST SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#070b14]/90 p-5 backdrop-blur-2xl flex flex-col justify-between">
          <div>
            {/* Branding Header */}
            <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/20 border border-red-500/40 text-xl shadow-[0_0_20px_rgba(255,59,78,0.4)]">
                  ⚡
                </span>
                <div>
                  <h1 className="font-black tracking-tight text-white text-lg">
                    Command <span className="text-[#FF3B4E]">Grid</span>
                  </h1>
                  <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Lifeline AI Responder Hub
                  </p>
                </div>
              </div>
            </div>

            {/* Nav Links */}
            <nav aria-label="Command Center Navigation" className="mt-6 space-y-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === "dashboard"
                    ? "bg-gradient-to-r from-red-600/20 to-red-500/10 text-white border border-red-500/30 shadow-md"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📊</span>
                  <span>Dashboard Overview</span>
                </div>
                {activeCount > 0 && (
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("incidents")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === "incidents"
                    ? "bg-gradient-to-r from-red-600/20 to-red-500/10 text-white border border-red-500/30 shadow-md"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🚨</span>
                  <span>Active Incidents</span>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {emergencies.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("routes")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === "routes"
                    ? "bg-gradient-to-r from-cyan-600/20 to-cyan-500/10 text-white border border-cyan-500/30 shadow-md"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🚑</span>
                  <span>Route Assistant</span>
                </div>
                <span className="rounded-full bg-cyan-500/10 text-cyan-400 px-2 py-0.5 text-[10px] font-bold">
                  AI
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("responders")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === "responders"
                    ? "bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 text-white border border-emerald-500/30 shadow-md"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">👥</span>
                  <span>Responder Mesh</span>
                </div>
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                  5 Active
                </span>
              </button>
            </nav>
          </div>

          {/* Bottom Sidebar Action */}
          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              <span>←</span>
              <span>Public App Mode</span>
            </Link>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Mesh Connected</span>
            </div>
          </div>
        </aside>

        {/* MAIN COMMAND CENTER BODY */}
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          
          {/* Top Status Header */}
          <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
                  {activeTab === "dashboard" && "Live Incident Telemetry"}
                  {activeTab === "incidents" && "Incident Control Center"}
                  {activeTab === "routes" && "AI Smart Route Assistant"}
                  {activeTab === "responders" && "Field Units & Responder Mesh"}
                </h2>
                <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-0.5 text-xs font-bold text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Central emergency coordinator • Automated triage and rapid dispatch matrix
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/report"
                className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-600 transition shadow-[0_0_15px_rgba(255,59,78,0.4)]"
              >
                <span>+ Log New Incident</span>
              </Link>
            </div>
          </header>

          {/* TELEMETRY METRIC TILES */}
          <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Active Tile */}
            <div className="glass-card rounded-3xl p-5 border-l-4 border-l-[#FF3B4E] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Alert</span>
                <span className="text-red-400 text-lg">🚨</span>
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black font-mono text-[#FF3B4E]">
                {String(activeCount).padStart(2, "0")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Requires immediate response</p>
            </div>

            {/* Responding Tile */}
            <div className="glass-card rounded-3xl p-5 border-l-4 border-l-[#F59E0B]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Units Dispatched</span>
                <span className="text-amber-400 text-lg">🚑</span>
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black font-mono text-[#F59E0B]">
                {String(respondingCount).padStart(2, "0")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">En route or on scene</p>
            </div>

            {/* Resolved Tile */}
            <div className="glass-card rounded-3xl p-5 border-l-4 border-l-[#10B981]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolved Today</span>
                <span className="text-emerald-400 text-lg">✓</span>
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black font-mono text-[#10B981]">
                {String(resolvedCount).padStart(2, "0")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Stabilized and cleared</p>
            </div>

            {/* Total Reports Tile */}
            <div className="glass-card rounded-3xl p-5 border-l-4 border-l-[#0EA5E9]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Mesh Events</span>
                <span className="text-cyan-400 text-lg">📡</span>
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black font-mono text-[#0EA5E9]">
                {String(emergencies.length).padStart(2, "0")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">All recorded logs</p>
            </div>
          </section>

          {/* TAB CONTENT: DASHBOARD & INCIDENTS */}
          {(activeTab === "dashboard" || activeTab === "incidents") && (
            <section className="mt-8 space-y-6">
              
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 rounded-2xl bg-slate-950/80 p-1 border border-white/10">
                  {(["all", "Active", "Responding", "Resolved"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setIncidentFilter(f)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-all ${
                        incidentFilter === f
                          ? "bg-slate-800 text-white shadow-md"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-slate-400">
                  Showing {filteredEmergencies.length} of {emergencies.length} incidents
                </span>
              </div>

              {/* Incidents Stream Cards */}
              <div className="grid gap-4">
                {filteredEmergencies.length === 0 ? (
                  <div className="glass-card rounded-3xl p-8 text-center text-slate-400 text-sm">
                    No incidents matching current filter criteria.
                  </div>
                ) : (
                  filteredEmergencies.map((inc) => {
                    const isCritical = inc.status === "Active";
                    const isResponding = inc.status === "Responding";
                    const edgeColor = isCritical ? "border-l-[#FF3B4E]" : isResponding ? "border-l-[#F59E0B]" : "border-l-[#10B981]";
                    const badgeBg = isCritical ? "bg-red-500/10 text-red-400 border-red-500/30" : isResponding ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

                    return (
                      <div
                        key={inc.id}
                        className={`glass-card rounded-3xl p-5 sm:p-6 border-l-4 ${edgeColor} transition-all hover:bg-slate-900/80`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          {/* Incident Details */}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-xl">
                                {inc.type.includes("Fire") ? "🔥" : inc.type.includes("Medical") ? "🚑" : inc.type.includes("Traffic") ? "🚗" : "🚨"}
                              </span>
                              <h3 className="font-bold text-white text-base">{inc.type}</h3>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeBg}`}>
                                {inc.status}
                              </span>
                              <span className="text-xs font-mono text-slate-400">• {inc.time}</span>
                            </div>

                            <p className="mt-2 text-xs font-semibold text-slate-300">
                              📍 Location: <span className="font-mono text-cyan-400">{inc.location}</span>
                            </p>

                            <p className="mt-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-white/5 whitespace-pre-line">
                              {inc.description}
                            </p>

                            {inc.photo && (
                              <div className="mt-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={inc.photo}
                                  alt="Report visual telemetry"
                                  className="max-h-40 rounded-2xl border border-white/10 object-cover"
                                />
                              </div>
                            )}
                          </div>

                          {/* Action & Status Transition Controls */}
                          <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 border-white/5 pt-3 lg:pt-0">
                            <div className="w-full lg:w-44">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Update Status
                              </label>
                              <select
                                value={inc.status}
                                onChange={(e) => updateStatus(inc.id, e.target.value as "Active" | "Responding" | "Resolved")}
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-white outline-none focus:border-cyan-400/50"
                              >
                                <option value="Active">🔴 Active Emergency</option>
                                <option value="Responding">🟡 Unit Responding</option>
                                <option value="Resolved">🟢 Incident Resolved</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab("routes");
                              }}
                              className="shrink-0 rounded-xl border border-white/10 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                            >
                              Dispatch Unit →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {/* TAB CONTENT: ROUTE ASSISTANT */}
          {activeTab === "routes" && (
            <section className="mt-8 space-y-6">
              <div className="glass-card rounded-3xl p-6 border border-cyan-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🚑</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">Smart Ambulance Route Intelligence</h3>
                    <p className="text-xs text-slate-400">
                      Calculates optimal emergency corridor, traffic clearance, and nearest trauma bay
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 mt-6">
                  {/* Step 1: Detect Location */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        alert("Geolocation is not supported by your browser");
                        return;
                      }

                      setIsLocating(true);
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const lat = position.coords.latitude;
                          const lng = position.coords.longitude;
                          setCurrentLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                          setHospitalError("");
                          try {
                            await findNearbyHospitals(lat, lng);
                          } catch {
                            setHospitalError("Unable to find nearby hospitals. Please retry.");
                          } finally {
                            setIsLocating(false);
                          }
                        },
                        () => {
                          setIsLocating(false);
                          alert("Please enable location access to calculate routes.");
                        }
                      );
                    }}
                    className="flex flex-col items-start justify-center rounded-2xl border border-white/10 bg-slate-950 p-4 hover:border-cyan-400/50 transition cursor-pointer"
                  >
                    <span className="text-xs font-bold uppercase text-slate-400">Step 1: Origin Fix</span>
                    <span className="mt-1 text-sm font-bold text-white">
                      {isLocating ? "📡 Acquiring GPS..." : currentLocation ? `📍 ${currentLocation}` : "📍 Detect Ambulance Location"}
                    </span>
                  </button>

                  {/* Step 2: Target Hospital */}
                  <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                    <span className="text-xs font-bold uppercase text-slate-400">Step 2: Receiving Facility</span>
                    {hospitals.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        {hospitals.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => setSelectedHospital(h)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                              selectedHospital?.id === h.id ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-900 text-slate-400"
                            }`}
                          >
                            <span>🏥 {h.name}</span>
                            <span className="font-mono">{h.distance.toFixed(1)}km</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">
                        {hospitalError || "Detect origin to query nearest trauma centers"}
                      </p>
                    )}
                  </div>

                  {/* Step 3: Urgency / Condition */}
                  <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                    <span className="text-xs font-bold uppercase text-slate-400">Step 3: Patient Condition</span>
                    <select
                      value={patientCondition}
                      onChange={(e) => setPatientCondition(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-2.5 text-xs font-bold text-white outline-none"
                    >
                      <option value="Critical">🔴 Critical (Priority 1 Siren)</option>
                      <option value="Serious">🟠 Serious (Urgent Transport)</option>
                      <option value="Stable">🟡 Stable (Standard Routine)</option>
                    </select>
                  </div>
                </div>

                {/* Analysis Actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentLocation) {
                        alert("Please detect ambulance location first.");
                        return;
                      }
                      setRouteAnalysis(true);
                    }}
                    className="rounded-2xl bg-cyan-500 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition shadow-lg"
                  >
                    🤖 Compute AI Emergency Route
                  </button>

                  <button
                    type="button"
                    onClick={startNavigation}
                    disabled={!selectedHospital || isLocating}
                    className="rounded-2xl bg-emerald-500 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🧭 Launch Turn-by-Turn Navigation
                  </button>
                </div>

                {/* AI Route Result */}
                {routeAnalysis && (
                  <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 animate-fade-in">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                      AI Triage & Highway Clearance Optimal
                    </span>
                    <h4 className="text-lg font-bold text-white mt-1">
                      🚑 Fast-Track Route Alpha — Recommended Corridor
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Signal preemption requested for 4 intersections on Highway 101 corridor.
                    </p>

                    <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                      <div className="rounded-xl bg-slate-950/80 p-3">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Estimated Arrival</span>
                        <p className="text-lg font-black text-white font-mono">11 min</p>
                      </div>
                      <div className="rounded-xl bg-slate-950/80 p-3">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Time Saved</span>
                        <p className="text-lg font-black text-emerald-400 font-mono">-7.5 min</p>
                      </div>
                      <div className="rounded-xl bg-slate-950/80 p-3">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Route Efficiency</span>
                        <p className="text-lg font-black text-emerald-400 font-mono">98/100</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB CONTENT: RESPONDERS MESH */}
          {activeTab === "responders" && (
            <section className="mt-8 space-y-4">
              <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Active Field Response Units</h3>
                    <p className="text-xs text-slate-400">Live GPS tracking and status allocation</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    All Radios Online
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {responders.map((unit) => {
                    const isEnRoute = unit.status === "En Route";
                    const isOnScene = unit.status === "On Scene";
                    const statusColor = isEnRoute ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : isOnScene ? "text-red-400 bg-red-500/10 border-red-500/30" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

                    return (
                      <div
                        key={unit.id}
                        className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">
                              {unit.type === "Ambulance" ? "🚑" : unit.type === "Police" ? "👮" : unit.type === "Fire" ? "🚒" : "🛟"}
                            </span>
                            <div>
                              <h4 className="font-bold text-white text-sm">{unit.callsign}</h4>
                              <p className="text-xs text-slate-400">{unit.type} Division</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {unit.status}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                          <span className="text-slate-400">ETA: <strong className="text-white font-mono">{unit.eta}</strong></span>
                          <button
                            type="button"
                            onClick={() => {
                              alert(`Radio channel opened with ${unit.callsign}`);
                            }}
                            className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 font-semibold text-slate-200 hover:bg-slate-800 transition text-[11px]"
                          >
                            📻 Direct Radio
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}
