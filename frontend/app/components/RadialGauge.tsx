"use client";

import React from "react";

interface RadialGaugeProps {
  score?: number; // 0 to 100
  label?: string;
  statusText?: string;
  subtitle?: string;
}

export default function RadialGauge({
  score = 12,
  label,
  statusText,
  subtitle,
}: RadialGaugeProps) {
  // Clamped score
  const safeScore = Math.min(100, Math.max(0, score));

  // Determine threat level color & text
  let currentLevel = "LOW RISK";
  let colorHex = "#10B981"; // Safe green
  let glowColor = "rgba(16, 185, 129, 0.35)";
  let badgeBg = "rgba(16, 185, 129, 0.12)";
  let badgeBorder = "rgba(16, 185, 129, 0.3)";
  let badgeText = "text-emerald-400";
  let statusIcon = "🛡️";

  if (safeScore > 65) {
    currentLevel = "CRITICAL RISK";
    colorHex = "#FF3B4E";
    glowColor = "rgba(255, 59, 78, 0.4)";
    badgeBg = "rgba(255, 59, 78, 0.15)";
    badgeBorder = "rgba(255, 59, 78, 0.4)";
    badgeText = "text-red-400";
    statusIcon = "🚨";
  } else if (safeScore > 35) {
    currentLevel = "ELEVATED RISK";
    colorHex = "#F59E0B";
    glowColor = "rgba(245, 158, 11, 0.35)";
    badgeBg = "rgba(245, 158, 11, 0.12)";
    badgeBorder = "rgba(245, 158, 11, 0.3)";
    badgeText = "text-amber-400";
    statusIcon = "⚠️";
  }

  const finalLabel = label || currentLevel;
  const finalSubtitle = subtitle || "Area telemetry & local security status nominal";

  // SVG Semi-Circle Math
  // Radius = 70, Center = (100, 95)
  // Arc spans 180 degrees from (30, 95) to (170, 95)
  const radius = 70;
  const circumference = Math.PI * radius; // ~219.9
  const strokeDashoffset = circumference - (circumference * safeScore) / 100;

  return (
    <div
      role="region"
      aria-label="Current Emergency Risk Level and Safety Telemetry"
      className="glass-card relative flex flex-col justify-between overflow-hidden rounded-3xl p-6"
    >
      {/* Background ambient gradient */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl transition-all duration-700"
        style={{ background: glowColor }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Real-time Threat Telemetry
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            backgroundColor: badgeBg,
            border: `1px solid ${badgeBorder}`,
          }}
        >
          <span>{statusIcon}</span>
          <span className={badgeText}>{statusText || "Live Monitor"}</span>
        </div>
      </div>

      {/* Radial Gauge SVG & Center Info */}
      <div className="my-3 flex flex-col items-center justify-center">
        <div className="relative flex h-36 w-56 items-center justify-center">
          <svg
            viewBox="0 0 200 120"
            className="h-full w-full overflow-visible"
            role="meter"
            aria-valuenow={safeScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Risk gauge score ${safeScore} out of 100: ${finalLabel}`}
          >
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#FF3B4E" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Track Arc */}
            <path
              d="M 30 100 A 70 70 0 0 1 170 100"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Filled Progress Arc */}
            <path
              d="M 30 100 A 70 70 0 0 1 170 100"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              filter="url(#glow)"
              style={{
                transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />

            {/* Tick marks */}
            <circle cx="30" cy="100" r="2" fill="#10B981" />
            <circle cx="100" cy="30" r="2" fill="#F59E0B" />
            <circle cx="170" cy="100" r="2" fill="#FF3B4E" />
          </svg>

          {/* Center Text Floating over SVG */}
          <div className="absolute bottom-2 flex flex-col items-center justify-center text-center">
            <span
              className="text-2xl font-black tracking-tight transition-colors duration-500 sm:text-3xl"
              style={{ color: colorHex }}
            >
              {finalLabel}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Risk Index <strong className="text-slate-200">{safeScore}</strong>/100
            </span>
          </div>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="mt-2 border-t border-white/[0.06] pt-3">
        <p className="text-xs text-slate-400">{finalSubtitle}</p>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-medium text-slate-300">
            <span className="text-emerald-400">●</span> 4 Responders On-duty
          </span>
          <span className="font-mono text-slate-400">Avg ETA ~4.2m</span>
        </div>
      </div>
    </div>
  );
}
