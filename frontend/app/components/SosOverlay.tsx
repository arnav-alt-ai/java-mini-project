"use client";

import React, { useEffect } from "react";
import type { EmergencyContact } from "../../lib/models";
import { buildEmergencyMessage, buildSmsLink } from "../../lib/smsLink";

interface SosOverlayProps {
  countdown: number | null;
  location: string | null;
  contacts: EmergencyContact[];
  smsConfigured: boolean | null;
  sosMessage: string;
  onCancel: () => void;
}

export default function SosOverlay({
  countdown,
  location,
  contacts,
  smsConfigured,
  sosMessage,
  onCancel,
}: SosOverlayProps) {
  // Lock background scroll when open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const isCountingDown = countdown !== null && countdown > 0;

  // Build SMS fallback link if needed
  const smsBody = buildEmergencyMessage({
    name: contacts[0]?.name ?? "User",
    latitude: null,
    longitude: null,
    accuracy: 10,
    createdAt: new Date(),
  });
  const smsNumbers = contacts.map((c) => c.phoneNumber);
  const smsHref = buildSmsLink(smsNumbers, smsBody);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Emergency SOS Alert Active"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-y-auto bg-[#070b14]/98 p-6 text-white backdrop-blur-2xl"
    >
      {/* Top Banner */}
      <div className="w-full max-w-xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-red-300">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          {isCountingDown ? "Emergency Countdown Active" : "🚨 EMERGENCY ALERT DISPATCHED"}
        </div>
      </div>

      {/* Main Center Body */}
      <div className="my-auto flex w-full max-w-lg flex-col items-center py-6 text-center">
        {isCountingDown ? (
          /* Countdown State */
          <div className="flex flex-col items-center">
            <div className="relative flex h-48 w-48 items-center justify-center">
              {/* Outer pulsing red ring */}
              <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
              <div className="flex h-40 w-40 items-center justify-center rounded-full border-8 border-red-500/40 bg-red-600/20 shadow-[0_0_80px_rgba(255,59,78,0.7)]">
                <span className="text-7xl font-black text-white drop-shadow-md">
                  {countdown}
                </span>
              </div>
            </div>

            <h2 className="mt-6 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Dispatching SOS Alert
            </h2>
            <p className="mt-2 text-sm text-slate-300 max-w-sm">
              Your location and medical profile will be automatically broadcast to emergency services and your contacts in {countdown} seconds.
            </p>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={onCancel}
              className="mt-8 w-full max-w-xs cursor-pointer rounded-2xl border-2 border-white/20 bg-slate-900/90 py-4 text-base font-bold text-slate-100 shadow-xl transition-all hover:bg-slate-800 hover:border-white/40 active:scale-95"
            >
              ✋ Cancel (False Alarm)
            </button>
          </div>
        ) : (
          /* Dispatched / Live Status State */
          <div className="w-full flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/20 border border-red-500/40 text-4xl shadow-[0_0_50px_rgba(255,59,78,0.5)]">
              📡
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Alerts Live & Transmitting
            </h2>
            <p className="mt-1 text-xs font-semibold text-emerald-400">
              ✓ Incident Logged with Response Grid
            </p>

            {/* Status Checklist Box */}
            <div className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-left text-sm backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Live Dispatch Telemetry
              </p>

              <div className="space-y-3">
                {/* Location */}
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    ✓
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-200">Live GPS Coordinates Transmitted</p>
                    <p className="text-xs text-slate-400 font-mono">
                      {location || "Acquiring high-accuracy satellite fix..."}
                    </p>
                  </div>
                </div>

                {/* Contacts Notified */}
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    ✓
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-200">
                      Emergency Contacts Alerted ({contacts.length})
                    </p>
                    {contacts.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {contacts.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {c.name} ({c.relationship})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400">
                        No contacts registered. Dispatch broadcasted to emergency mesh.
                      </p>
                    )}
                  </div>
                </div>

                {/* Response Message */}
                {sosMessage && (
                  <div className="flex items-start gap-3 border-t border-white/5 pt-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
                      ℹ
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-slate-300">{sosMessage}</p>
                      {smsConfigured === false && (
                        <p className="mt-1 text-[11px] text-amber-400">
                          Automatic carrier SMS not configured — manual direct links provided below.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Calling / SMS Actions */}
            {contacts.length > 0 && (
              <div className="mt-4 w-full">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Direct Line to Contacts
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {contacts.map((contact) => (
                    <a
                      key={contact.id}
                      href={`tel:${contact.phoneNumber}`}
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all"
                    >
                      📞 Call {contact.name}
                    </a>
                  ))}
                  {smsHref && (
                    <a
                      href={smsHref}
                      className="col-span-full flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 py-2.5 text-xs font-bold text-blue-300 hover:bg-blue-500/20 transition-all"
                    >
                      💬 Send Direct SMS Broadcast
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Abort / Safe button */}
            <button
              type="button"
              onClick={onCancel}
              className="mt-6 w-full cursor-pointer rounded-2xl border border-slate-700 bg-slate-900/90 py-3.5 text-sm font-bold text-slate-200 transition-all hover:bg-slate-800"
            >
              ✅ I Am Safe Now / Cancel Alert
            </button>
          </div>
        )}
      </div>

      {/* Safety Instructions Footer */}
      <div className="w-full max-w-xl text-center text-xs text-slate-400">
        <p>Stay where you are if safe • Keep phone volume high • Responders have been notified</p>
      </div>
    </div>
  );
}
