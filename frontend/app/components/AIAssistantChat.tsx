"use client";

import React, { useState, useRef, useEffect } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string;
};

interface AIAssistantChatProps {
  onEscalateToSos: () => void;
}

const QUICK_ACTIONS = [
  { label: "🔥 Fire / Smoke", prompt: "There is a fire or smoke emergency nearby." },
  { label: "🚑 Medical Crisis", prompt: "Someone is unconscious or severely injured." },
  { label: "🚗 Traffic Accident", prompt: "There is a severe vehicle crash with possible injuries." },
  { label: "⚠️ Unsafe Person", prompt: "Someone suspicious or threatening is following me." },
  { label: "🆘 Trapped / Rescue", prompt: "I am trapped and cannot safely exit." },
];

export default function AIAssistantChat({ onEscalateToSos }: AIAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-1",
      role: "ai",
      text: "Lifeline AI triage online. Tell me what's happening or tap an emergency preset below for instant step-by-step guidance.",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    // AI Emergency Triage Response Logic
    window.setTimeout(() => {
      const lower = text.toLowerCase();
      let reply = "Please stay in a safe position. If immediate danger exists, tap 'Escalate to SOS' above.";

      if (lower.includes("fire") || lower.includes("smoke") || lower.includes("burn")) {
        reply = "🚨 FIRE PROTOCOL:\n1. Evacuate immediately — get low under smoke.\n2. Do NOT use elevators.\n3. Feel doors for heat with the back of your hand before opening.\n4. Call emergency responders once outside.";
      } else if (
        lower.includes("medical") ||
        lower.includes("unconscious") ||
        lower.includes("bleeding") ||
        lower.includes("heart") ||
        lower.includes("injured")
      ) {
        reply = "🚑 MEDICAL PROTOCOL:\n1. Check if the patient is responsive and breathing.\n2. If severe bleeding, apply firm direct pressure with clean cloth.\n3. Do NOT move them if spinal or neck injury is suspected.\n4. Keep patient warm and stay on the line with dispatch.";
      } else if (
        lower.includes("accident") ||
        lower.includes("crash") ||
        lower.includes("collision") ||
        lower.includes("car")
      ) {
        reply = "🚗 VEHICLE CRASH PROTOCOL:\n1. Move yourself to a safe spot away from traffic if able.\n2. Turn on hazard lights.\n3. Check others for injuries without moving severely wounded passengers.\n4. Stand clear of flammable fluid spills.";
      } else if (
        lower.includes("unsafe") ||
        lower.includes("person") ||
        lower.includes("following") ||
        lower.includes("threatening") ||
        lower.includes("stalk")
      ) {
        reply = "⚠️ PERSONAL THREAT PROTOCOL:\n1. Head toward a well-lit, populated public area or store.\n2. Do NOT go directly to an isolated car or home.\n3. Call emergency services or tap 'Escalate to SOS'.\n4. Share live check-in tracking with your trusted contacts.";
      } else if (lower.includes("trapped") || lower.includes("stuck") || lower.includes("rescue")) {
        reply = "🆘 RESCUE PROTOCOL:\n1. Stay calm to conserve oxygen and energy.\n2. Tap pipes or make rhythmic noise in sets of 3.\n3. Keep your phone battery conserved.\n4. Escalate to SOS so your exact coordinates are broadcast.";
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div
      id="lifeline-chat"
      className="glass-card flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl"
    >
      {/* Header with Persistent Escalate Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xl text-cyan-300">
            🤖
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              Lifeline AI Assistant
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">Emergency guidance & triage assistant</p>
          </div>
        </div>

        {/* Persistent Escalate to SOS Button */}
        <button
          type="button"
          onClick={onEscalateToSos}
          aria-label="Escalate emergency to SOS broadcast"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(255,59,78,0.4)] transition-all hover:scale-105 active:scale-95"
        >
          <span>🚨</span>
          <span>Escalate to SOS</span>
        </button>
      </div>

      {/* Quick-Reply Emergency Chips */}
      <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => handleSend(action.prompt)}
            className="shrink-0 cursor-pointer rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-cyan-400/40 hover:bg-slate-700/80 active:scale-95"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Message History Container */}
      <div className="flex h-80 flex-col gap-3 overflow-y-auto rounded-2xl bg-slate-950/70 p-4 border border-white/5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none font-medium"
                  : "bg-slate-800/90 text-slate-100 rounded-tl-none border border-white/10"
              }`}
            >
              {msg.text}
            </div>
            <span className="mt-1 px-1 text-[10px] text-slate-400">
              {msg.role === "user" ? "You" : "Lifeline AI"} • {msg.timestamp}
            </span>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none bg-slate-800/90 px-4 py-3 border border-white/10 w-fit">
            <span className="typing-dot h-2 w-2 rounded-full bg-cyan-400" />
            <span className="typing-dot h-2 w-2 rounded-full bg-cyan-400" />
            <span className="typing-dot h-2 w-2 rounded-full bg-cyan-400" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your situation or ask for guidance..."
          className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="cursor-pointer rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
}
