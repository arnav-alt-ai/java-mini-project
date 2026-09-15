"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import OfflineBanner from "../OfflineBanner";
import ProtectedRoute from "../ProtectedRoute";
import { enqueueOfflineAction, getLastKnownLocation, syncOfflineQueue } from "../../lib/offlineQueue";

const EMERGENCY_TYPES = [
  { id: "Medical Emergency", label: "Medical Crisis", icon: "🚑", color: "from-red-500/20 to-rose-500/10", border: "border-red-500/40", badge: "Critical Priority", badgeColor: "text-red-400 bg-red-500/10" },
  { id: "Fire Emergency", label: "Fire / Explosion", icon: "🔥", color: "from-amber-500/20 to-orange-500/10", border: "border-orange-500/40", badge: "Evacuation Risk", badgeColor: "text-amber-400 bg-amber-500/10" },
  { id: "Traffic Accident", label: "Vehicle Collision", icon: "🚗", color: "from-blue-500/20 to-indigo-500/10", border: "border-blue-500/40", badge: "Road Hazard", badgeColor: "text-blue-400 bg-blue-500/10" },
  { id: "Crime or Security Emergency", label: "Security / Violence", icon: "⚠️", color: "from-purple-500/20 to-pink-500/10", border: "border-purple-500/40", badge: "Immediate Threat", badgeColor: "text-purple-400 bg-purple-500/10" },
  { id: "Natural Disaster", label: "Natural Disaster", icon: "🌊", color: "from-teal-500/20 to-cyan-500/10", border: "border-teal-500/40", badge: "Flood / Quake", badgeColor: "text-teal-400 bg-teal-500/10" },
  { id: "General Emergency", label: "Other Hazard", icon: "📢", color: "from-slate-500/20 to-slate-600/10", border: "border-slate-500/40", badge: "Emergency Assist", badgeColor: "text-slate-300 bg-slate-500/10" },
];

const QUICK_TAGS = [
  "Unconscious victims",
  "Severe bleeding",
  "Heavy smoke / flames",
  "Trapped occupants",
  "Vehicles overturned",
  "Weapons spotted",
  "Structural damage",
  "Power lines down",
];

const STEPS = [
  { step: 1, title: "Category", subtitle: "Select incident" },
  { step: 2, title: "Details", subtitle: "What's happening" },
  { step: 3, title: "Location & Photo", subtitle: "Live telemetry" },
  { step: 4, title: "Review & Send", subtitle: "Final dispatch" },
];

export default function ReportPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportType, setReportType] = useState("Medical Emergency");
  const [severity, setSeverity] = useState<"Critical" | "High" | "Moderate">("Critical");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  // Auto-detect location on initial component mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setCoordinates({ latitude: lat, longitude: lng });
            setGpsAccuracy(Math.round(position.coords.accuracy));
            setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            setIsLocating(false);
          },
          () => {
            const cached = getLastKnownLocation();
            if (cached) {
              setCoordinates({ latitude: cached.latitude, longitude: cached.longitude });
              setGpsAccuracy(cached.accuracy ?? 50);
              setLocation(`${cached.latitude.toFixed(5)}, ${cached.longitude.toFixed(5)}`);
            }
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const detectLocationManual = () => {
    if (!navigator.geolocation) {
      setMessage("Location is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordinates({ latitude: lat, longitude: lng });
        setGpsAccuracy(Math.round(position.coords.accuracy));
        setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setMessage("Please allow location access to attach live telemetry.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const addQuickTag = (tag: string) => {
    if (!description.includes(tag)) {
      setDescription((prev) => (prev ? `${prev}, ${tag}` : tag));
    }
  };

  const submitReport = () => {
    const cachedLocation = coordinates || getLastKnownLocation();
    const effectiveLocation = location || (cachedLocation
      ? `${cachedLocation.latitude.toFixed(5)}, ${cachedLocation.longitude.toFixed(5)}`
      : "");
    
    if (!description.trim() || !effectiveLocation) {
      setMessage("Please ensure description and location are provided.");
      return;
    }

    let existingReports = [];
    try {
      existingReports = JSON.parse(
        window.localStorage.getItem("emergencies") || "[]"
      );
    } catch {
      existingReports = [];
    }

    const report = {
      id: crypto.randomUUID(),
      clientRequestId: crypto.randomUUID(),
      type: reportType,
      severity,
      location: effectiveLocation,
      latitude: cachedLocation?.latitude ?? null,
      longitude: cachedLocation?.longitude ?? null,
      description: description.trim(),
      status: "Active",
      time: "Just now",
      photo: photo || undefined,
    };

    if (!navigator.onLine) {
      enqueueOfflineAction("report", report);
      setIsSubmitted(true);
      setMessage("You're offline. Alert saved and will be sent automatically once connected.");
      return;
    }

    enqueueOfflineAction("report", report);
    void syncOfflineQueue();

    window.localStorage.setItem(
      "emergencies",
      JSON.stringify([report, ...existingReports])
    );
    window.dispatchEvent(new Event("emergencies-updated"));
    setIsSubmitted(true);
    setMessage("Emergency report submitted successfully. Nearest units have been alerted.");
  };

  const selectedCategoryObj = EMERGENCY_TYPES.find((t) => t.id === reportType) || EMERGENCY_TYPES[0];

  return (
    <ProtectedRoute role="user">
      <main className="app-atmosphere min-h-screen px-4 py-8 sm:px-6 text-white">
        <OfflineBanner />

        <div className="mx-auto max-w-2xl">
          {/* Back Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              <span>←</span>
              <span>Cancel & Return Home</span>
            </Link>
            <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
              🚨 Verified Field Dispatch
            </span>
          </div>

          {/* Stepper Header */}
          <div className="mt-6 glass-card rounded-3xl p-6 shadow-2xl">
            {/* Progress Bar Dots */}
            <div className="flex items-center justify-between relative mb-6">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/10 z-0" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-red-500 to-cyan-400 z-0 transition-all duration-300"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />

              {STEPS.map((s) => {
                const isActive = s.step === currentStep;
                const isCompleted = s.step < currentStep;

                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      if (isCompleted || s.step === currentStep) {
                        setCurrentStep(s.step);
                      }
                    }}
                    className={`relative z-10 flex flex-col items-center group focus:outline-none`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all shadow-md ${
                        isActive
                          ? "bg-gradient-to-tr from-red-500 to-rose-400 text-white ring-4 ring-red-500/30 scale-110"
                          : isCompleted
                          ? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/40"
                          : "bg-slate-900 text-slate-500 border border-white/10"
                      }`}
                    >
                      {isCompleted ? "✓" : s.step}
                    </div>
                    <span
                      className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
                        isActive ? "text-white" : isCompleted ? "text-emerald-400" : "text-slate-400"
                      }`}
                    >
                      {s.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Step Header Title */}
            <div className="border-t border-white/[0.08] pt-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Step {currentStep} of 4 • {STEPS[currentStep - 1].subtitle}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {currentStep === 1 && "Select Emergency Type"}
                  {currentStep === 2 && "Describe the Situation"}
                  {currentStep === 3 && "Confirm Location & Evidence"}
                  {currentStep === 4 && "Review & Broadcast Report"}
                </h1>
              </div>
            </div>

            {/* Wizard Content Body */}
            <div className="mt-6">
              {/* STEP 1: CATEGORY SELECTION */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {EMERGENCY_TYPES.map((type) => {
                      const isSelected = reportType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setReportType(type.id)}
                          className={`flex items-start gap-3.5 rounded-2xl p-4 text-left transition-all cursor-pointer ${
                            isSelected
                              ? `bg-gradient-to-br ${type.color} border-2 ${type.border} shadow-[0_0_25px_rgba(255,59,78,0.2)] scale-[1.02]`
                              : "bg-slate-950/60 border border-white/10 hover:bg-slate-900 hover:border-white/20"
                          }`}
                        >
                          <span className="text-3xl">{type.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-white text-sm">{type.label}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${type.badgeColor}`}>
                                {type.badge}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{type.id}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Urgency Level Selector */}
                  <div className="mt-5 rounded-2xl bg-slate-950/70 p-4 border border-white/10">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Report Urgency Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Critical", "High", "Moderate"] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSeverity(lvl)}
                          className={`rounded-xl py-2.5 text-xs font-bold transition ${
                            severity === lvl
                              ? lvl === "Critical"
                                ? "bg-red-500 text-white shadow-lg"
                                : lvl === "High"
                                ? "bg-amber-500 text-slate-950 shadow-lg"
                                : "bg-cyan-500 text-slate-950 shadow-lg"
                              : "bg-slate-900 text-slate-400 border border-white/10 hover:bg-slate-800"
                          }`}
                        >
                          {lvl === "Critical" ? "🔴 Critical" : lvl === "High" ? "🟠 High" : "🟡 Moderate"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: DETAILS & DESCRIPTION */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Quick Situation Tags (Tap to add)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addQuickTag(tag)}
                          className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-400/50 hover:bg-slate-900 transition"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Detailed Incident Description <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what happened, number of people involved, visible hazards, or specific assistance needed..."
                      rows={5}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>Be concise and specific about hazards</span>
                      <span>{description.length} chars</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: LOCATION & PHOTO */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  {/* Live GPS Telemetry Box */}
                  <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">📍</span>
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400">GPS Coordinates</p>
                          <p className="text-sm font-mono font-bold text-white">
                            {location || "Acquiring satellite position..."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={detectLocationManual}
                        disabled={isLocating}
                        className="rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                      >
                        {isLocating ? "📡 Refreshing..." : "🔄 Refresh"}
                      </button>
                    </div>
                    {gpsAccuracy && (
                      <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>High-accuracy satellite fix (±{gpsAccuracy}m radius)</span>
                      </div>
                    )}
                  </div>

                  {/* Camera / Photo Attachment */}
                  <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Visual Evidence (Optional)
                    </p>

                    {!photo ? (
                      <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 p-6 cursor-pointer hover:border-cyan-400/50 hover:bg-slate-900/50 transition">
                        <span className="text-3xl mb-2">📷</span>
                        <span className="text-sm font-bold text-slate-200">Capture or Upload Photo</span>
                        <span className="text-xs text-slate-400 mt-1">Helps responders prepare appropriate equipment</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => setPhoto(String(reader.result));
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt="Incident attachment"
                          className="max-h-56 w-full object-cover rounded-2xl"
                        />
                        <button
                          type="button"
                          onClick={() => setPhoto("")}
                          className="absolute top-2 right-2 rounded-xl bg-slate-950/80 border border-white/20 px-3 py-1 text-xs font-bold text-red-300 hover:bg-slate-900 transition"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & DISPATCH */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  {isSubmitted ? (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                      <span className="text-4xl">✅</span>
                      <h2 className="mt-3 text-xl font-bold text-white">Emergency Dispatched</h2>
                      <p className="mt-1 text-sm text-slate-300">{message}</p>
                      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                          href="/dashboard"
                          className="rounded-xl bg-cyan-500 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition"
                        >
                          View Live Command Grid →
                        </Link>
                        <Link
                          href="/"
                          className="rounded-xl border border-white/10 bg-slate-900 px-6 py-3 text-xs font-bold text-slate-200 hover:bg-slate-800 transition"
                        >
                          Return to Home
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Summary Review Receipt */}
                      <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{selectedCategoryObj.icon}</span>
                            <div>
                              <h3 className="font-bold text-white text-base">{reportType}</h3>
                              <span className="text-xs text-red-400 font-semibold">{severity} Urgency</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className="text-xs text-cyan-400 hover:underline"
                          >
                            Edit
                          </button>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400">Situation Details</p>
                          <p className="mt-1 text-sm text-slate-200 bg-slate-900 p-3 rounded-xl border border-white/5 whitespace-pre-line">
                            {description || "No specific details provided."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs">
                          <div>
                            <span className="text-slate-400">📍 Location: </span>
                            <span className="font-mono text-white">{location || "GPS Pending"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">📷 Photo: </span>
                            <span className="text-white">{photo ? "Attached (1)" : "None"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Massive Broadcast Button */}
                      <button
                        type="button"
                        onClick={submitReport}
                        disabled={!description.trim() || !location}
                        className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 py-4 text-base font-black uppercase tracking-wider text-white shadow-[0_0_30px_rgba(255,59,78,0.5)] transition hover:scale-[1.01] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🚨 Broadcast Emergency Report
                      </button>

                      {message && (
                        <p className="rounded-xl bg-slate-900 border border-white/10 p-3 text-xs text-slate-300 text-center">
                          {message}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Stepper Bottom Navigation Actions */}
            {!isSubmitted && (
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                    className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                  >
                    ← Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 2 && !description.trim()) {
                        setMessage("Please provide a brief description before continuing.");
                        return;
                      }
                      setMessage("");
                      setCurrentStep((prev) => Math.min(4, prev + 1));
                    }}
                    className="rounded-xl bg-cyan-500 px-6 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition shadow-md"
                  >
                    Next Step →
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
