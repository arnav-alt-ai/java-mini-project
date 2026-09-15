"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavBarProps {
  onSosClick: () => void;
  onAssistantClick?: () => void;
}

export default function BottomNavBar({
  onSosClick,
  onAssistantClick,
}: BottomNavBarProps) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 md:hidden">
      <nav
        aria-label="Main Navigation"
        className="mx-auto flex max-w-md items-center justify-around rounded-3xl border border-white/10 bg-slate-950/90 px-3 py-2 shadow-2xl backdrop-blur-xl"
      >
        {/* Home Tab */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold transition-colors ${
            pathname === "/" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-lg">🏠</span>
          <span>Home</span>
        </Link>

        {/* AI Assistant Tab */}
        <button
          type="button"
          onClick={() => {
            if (onAssistantClick) {
              onAssistantClick();
            } else {
              document.getElementById("lifeline-chat")?.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="text-lg">🤖</span>
          <span>Assistant</span>
        </button>

        {/* Center Raised SOS FAB Button */}
        <div className="-mt-8 flex flex-col items-center">
          <button
            type="button"
            onClick={onSosClick}
            aria-label="Quick Emergency SOS trigger"
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-red-500 text-white shadow-[0_0_30px_rgba(255,59,78,0.7)] transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-400/50"
          >
            {/* Ambient subtle glow ring */}
            <span className="absolute inset-0 rounded-full border-2 border-red-400/50 animate-ping opacity-50 pointer-events-none" />
            <span className="text-2xl font-black">SOS</span>
          </button>
        </div>

        {/* Report Tab */}
        <Link
          href="/report"
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold transition-colors ${
            pathname === "/report" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-lg">📢</span>
          <span>Report</span>
        </Link>

        {/* Dashboard / Responders Tab */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold transition-colors ${
            pathname === "/dashboard" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-lg">📊</span>
          <span>Live Grid</span>
        </Link>
      </nav>
    </div>
  );
}
