# 🚑 Lifeline AI — Critical Response Network

<p align="center">
  <img src="https://img.shields.io/badge/status-active--development-red?style=for-the-badge" />
  <img src="https://img.shields.io/badge/emergency--response-AI--powered-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" />
</p>

<p align="center">
  <b>Help is closer than you think.</b><br/>
  An AI-powered emergency assistance platform that connects citizens in distress to real help — instantly, intelligently, and without friction.
</p>

<p align="center">
  🔗 <b>Live Demo:</b> [ https://java-mini-project-two.vercel.app/]
</p>

---

## 🧭 Overview

**Lifeline AI** is a critical-response web platform built to close the gap between "something is wrong" and "help is on the way." Most emergency reporting today relies on slow phone calls, vague addresses, and zero real-time coordination. Lifeline AI replaces that with a single unified system:

- A citizen in danger gets **instant SOS dispatch**, an **AI triage assistant**, and **live location sharing** — no forms, no friction.
- Responders and admins get a **command-grid dashboard** with real-time incidents, severity-coded alerts, and smart ambulance routing.
- Every action — from a press-and-hold SOS to a resolved incident — is tracked, isolated by role, and built to work under pressure, not around it.

This isn't just a CRUD app with a red button. It's designed around one core principle: **a person in crisis has zero patience for a slow interface.**

---

## ✨ Features

### 🆘 For Citizens (User App)

| Feature | Description |
|---|---|
| **One-Tap SOS Dispatch** | Press-and-hold (1.5s) SOS trigger with a live confirmation ring — prevents accidental alerts while staying instant in a real emergency. Sends live GPS, medical profile, and pings all saved emergency contacts. |
| **Real-Time Threat Telemetry** | A radial risk gauge (0–100 index) showing the safety status of the user's current zone, backed by responder on-duty counts and average ETA. |
| **Lifeline AI Assistant** | A conversational triage bot with quick-tap presets (Fire/Smoke, Medical Crisis, Traffic Accident, Unsafe Person, Trapped/Rescue) for instant step-by-step guidance — with a persistent **"Escalate to SOS"** button always in view. |
| **Safety Check-In (Dead-Man Switch)** | Start a monitored timer for risky activities (walking home, cab ride, solo hike, night shift, first date). If the user doesn't check in before the timer ends, it auto-escalates to an alert. |
| **Emergency Contacts** | Register up to 3 trusted guardians who are automatically notified — with live coordinates — the moment an SOS fires. |
| **Nearby Emergency Services Map** | Live map of hospitals, police stations, fire rescue, and safe shelters within a 10km radius, powered by OpenStreetMap/Leaflet. |
| **4-Step Guided Emergency Report** | A wizard-style incident report (Category → Details → Location & Photo → Review & Send) instead of one long form — reduces cognitive load when every second counts. Includes urgency tagging (Critical / High / Moderate). |
| **My Reports** | A personal, private history of the user's own submitted reports and their live status — visible to no one but them. |

### 🛰️ For Admins / Responders (Command Grid)

| Feature | Description |
|---|---|
| **Live Incident Dashboard** | Real-time feed of all active alerts across the network, color-coded by severity, with live-updating response counters (Active / Responding / Resolved / Nearby Help). |
| **Full Incident Map** | System-wide map with pulsing markers for unassigned incidents and static markers for assigned ones. |
| **Smart Ambulance Route Assistant** | AI-assisted route intelligence that calculates the fastest path to a critical patient and supports live navigation handoff. |
| **Incident Ownership & Status Control** | Responders can accept incidents (with race-condition protection so two responders can't claim the same case) and move status through Active → Responding → Resolved, with a full audit trail. |
| **Responder Management** | View and manage active responder accounts and their current assignments. |

### 🔐 Access & Security

- **Role-based authentication** with a Citizen / Admin toggle right on the login screen — no ambiguity about which portal you're entering.
- **Strict data isolation**: citizens can only ever see their own reports; system-wide data is fully gated behind server-side admin checks (not just hidden UI).
- **Invite-code gated admin signup** — no one can self-register as a responder.
- Encrypted transmission of medical and location data end-to-end.

---

## 🎨 Design Philosophy

Lifeline AI is built on one rule: **a stressed user should never have to think about the interface.**

- 🔴 Red is reserved *exclusively* for urgent, action-triggering elements — never used decoratively — so it always means "this matters right now."
- 🫁 The SOS button breathes with a subtle pulse at rest, and requires a deliberate hold-to-confirm gesture, balancing speed with accidental-trigger prevention.
- 🧠 The AI Assistant leads with tap-to-select presets, because typing a coherent sentence during a panic attack is often the hardest part.
- 📶 Every critical status (risk level, incident severity) is conveyed with **color + icon + text**, never color alone — because clarity beats aesthetics when it matters.

---

## 🛠️ Tech Stack

<!-- Fill in / adjust based on your actual stack -->
- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js / Express (or Spring Boot)
- **Database:** MongoDB / PostgreSQL
- **Maps:** Leaflet + OpenStreetMap
- **Auth:** JWT-based, role-gated (Citizen / Admin)
- **Deployment:** Vercel

---

## 📸 Screenshots

| SOS Dashboard | AI Assistant | Report Wizard |
|---|---|---|
| <img width="1026" height="785" alt="image" src="https://github.com/user-attachments/assets/c2df78df-9bbd-48f1-b4be-e1657fe13d13" />
| <img width="1637" height="725" alt="image" src="https://github.com/user-attachments/assets/ca280223-f777-414d-91c3-94bc15cdb859" />
|  <img width="956" height="837" alt="image" src="https://github.com/user-attachments/assets/40408d1c-3896-4c24-84be-9501bc63335d" />
|

| Safety Check-In & Contacts | Nearby Services Map |
|---|---|
| <img width="1657" height="542" alt="image" src="https://github.com/user-attachments/assets/de8af2b1-915b-4e3c-8846-a92521b2a515" />
| <img width="1648" height="770" alt="image" src="https://github.com/user-attachments/assets/dac3f408-e70d-4bd5-9b08-8ccc0b31275c" />
|

---
## 🗺️ Roadmap

- [ ] Guest SOS (send an alert without requiring login)
- [ ] Multilingual support (Hindi / Marathi / regional languages)
- [ ] Voice-to-text emergency reporting
- [ ] Offline mode with auto-sync once reconnected
- [ ] AI-driven severity auto-classification for incoming reports
- [ ] Live responder-to-victim ETA tracking (Uber-style)
- [ ] Incident heatmap analytics for city authorities

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the [issues page](../../issues) or open a PR.

---

## 👥 Team

Lifeline AI is built by a team passionate about using technology to close the gap between crisis and response.

| Name | Role | GitHub |
|---|---|---|
| <!-- Your Name --> | <!-- e.g. Full-Stack Developer / Team Lead --> | (#) |
| <!-- Teammate 2 --> | <!-- e.g. Frontend / UI Design --> | [@username](#) |
| <!-- Teammate 3 --> | <!-- e.g. Backend / Database --> | [@username](#) |
| <!-- Teammate 4 --> | <!-- e.g. AI Integration --> | [@username](#) |

> Built as part of a Java Mini Project — combining real-world emergency-response UX with core OOP principles (Encapsulation, Inheritance, Polymorphism, Abstraction).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with the belief that <b>help should never be more than one tap away.</b>
</p>
