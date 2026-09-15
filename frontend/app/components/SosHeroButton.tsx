"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface SosHeroButtonProps {
  onTriggerSos: () => void;
  isTriggered?: boolean;
  disabled?: boolean;
}

const HOLD_DURATION_MS = 1500; // 1.5s press-and-hold

export default function SosHeroButton({
  onTriggerSos,
  isTriggered = false,
  disabled = false,
}: SosHeroButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  const cancelHold = useCallback(() => {
    setIsHolding(false);
    setProgress(0);
    startTimeRef.current = null;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const triggerSos = useCallback(() => {
    triggeredRef.current = true;
    cancelHold();
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([100, 50, 100, 50, 200]);
      } catch {
        // ignore
      }
    }
    onTriggerSos();
  }, [cancelHold, onTriggerSos]);

  const handleHoldStart = (e: React.SyntheticEvent) => {
    if (disabled || isTriggered) return;
    // Don't prevent default on spacebar/enter if it interferes, but prevent touch scrolling
    if (e.type.startsWith("touch")) {
      // touchstart
    }
    
    setIsHolding(true);
    startTimeRef.current = performance.now();
    triggeredRef.current = false;

    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(30);
      } catch {
        // ignore
      }
    }

    const updateProgress = (now: number) => {
      if (!startTimeRef.current) return;
      const elapsed = now - startTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setProgress(pct);

      if (pct >= 100) {
        triggerSos();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handleHoldEnd = () => {
    if (!triggeredRef.current) {
      cancelHold();
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // SVG dimensions for the circular progress ring
  // Center: 100, 100, Radius: 88, Circumference: 2 * PI * 88 = 552.92
  const circleRadius = 88;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-4">
      {/* Outer ambient breathing rings */}
      <div className="relative flex items-center justify-center">
        {!isHolding && !isTriggered && (
          <>
            <div className="animate-sos-ring pointer-events-none absolute h-64 w-64 rounded-full bg-red-500/10 blur-md sm:h-72 sm:w-72" />
            <div className="animate-sos-ring-delayed pointer-events-none absolute h-64 w-64 rounded-full bg-red-600/15 blur-sm sm:h-72 sm:w-72" />
          </>
        )}

        {/* Circular Progress Bar SVG */}
        <div className="relative h-48 w-48 sm:h-56 sm:w-56">
          <svg
            className="absolute inset-0 -rotate-90 h-full w-full overflow-visible"
            viewBox="0 0 200 200"
          >
            {/* Background track circle */}
            <circle
              cx="100"
              cy="100"
              r={circleRadius}
              fill="transparent"
              stroke="rgba(255, 59, 78, 0.15)"
              strokeWidth={isHolding ? "10" : "6"}
              className="transition-all duration-200"
            />
            {/* Filling Progress Ring */}
            <circle
              cx="100"
              cy="100"
              r={circleRadius}
              fill="transparent"
              stroke="#FF3B4E"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                filter: "drop-shadow(0 0 10px rgba(255, 59, 78, 0.8))",
                transition: isHolding ? "none" : "stroke-dashoffset 0.2s ease-out",
              }}
            />
          </svg>

          {/* Center SOS Button */}
          <button
            type="button"
            role="button"
            aria-label="Emergency SOS button. Press and hold for 1.5 seconds to dispatch emergency alerts."
            aria-pressed={isHolding || isTriggered}
            disabled={disabled}
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onTouchCancel={handleHoldEnd}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !isHolding) {
                e.preventDefault();
                handleHoldStart(e);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                handleHoldEnd();
              }
            }}
            className={`absolute inset-4 rounded-full flex flex-col items-center justify-center text-white transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-400/50 shadow-2xl ${
              isHolding
                ? "scale-95 bg-gradient-to-b from-[#ff2338] to-[#d60017] shadow-[0_0_60px_rgba(255,59,78,0.8)]"
                : "bg-gradient-to-b from-[#ff3b4e] to-[#cc182a] hover:from-[#ff5263] hover:to-[#e01d31] animate-sos-breathe"
            }`}
          >
            {/* SOS Label & Icon */}
            <div className="flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl sm:text-4xl">🚨</span>
              <span className="mt-1 text-3xl font-black tracking-wider text-white drop-shadow-md sm:text-4xl">
                SOS
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-100/90 sm:text-xs">
                {isHolding ? `${Math.round(progress)}% HOLDING` : "EMERGENCY"}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Instructional Caption */}
      <div className="mt-4 flex flex-col items-center text-center">
        <div
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
            isHolding
              ? "bg-red-500/20 text-red-300 border border-red-500/40 scale-105"
              : "bg-slate-900/80 text-slate-300 border border-white/10"
          }`}
        >
          {isHolding ? (
            <>
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span>Keep holding... Release to cancel</span>
            </>
          ) : (
            <>
              <span className="text-red-400">●</span>
              <span>Press and hold 1.5s to trigger</span>
            </>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400 max-w-xs">
          Sends live GPS coordinates, medical profile & alerts all emergency contacts
        </p>
      </div>
    </div>
  );
}
