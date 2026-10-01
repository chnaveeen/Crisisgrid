# 🚨 CrisisGrid AI

> **AI-Powered Emergency Resource Coordination Platform**

CrisisGrid AI is a full-stack emergency response platform that uses **AI, real-time communication, geolocation, CCTV detection, and resource management** to coordinate emergency response.

## ✨ Features

* 🚨 **Emergency Reporting** — Report emergencies with location.
* 🤖 **AI Analysis** — Detects category, severity, summary, and required resources.
* 📹 **CCTV Detection** — Finds nearby cameras and captures simulated evidence.
* ⚡ **Real-Time Alerts** — Live incident and CCTV updates using Socket.IO.
* 🗺️ **Control Center** — Live map, incidents, cameras, filters, and metrics.
* 🚑 **Resource Dispatch** — Manage ambulances, fire trucks, rescue teams, boats, and medical kits.
* 🔐 **Authentication** — JWT, bcrypt, and role-based access.
* 🎥 **Camera Support** — Mock, IP, and RTSP camera providers.

## 🛠️ Tech Stack

**Frontend:** React, Vite, Tailwind CSS
**Backend:** Node.js, Express.js
**Database:** MySQL
**AI:** Gemini/OpenAI-compatible API + Rule-Based Fallback
**Real-Time:** Socket.IO
**Maps:** Leaflet + OpenStreetMap
**Security:** JWT + bcrypt

## 📂 Structure

```text
CrisisGrid/
├── frontend/       # React application
├── backend/        # Express API, AI & CCTV
├── database/       # MySQL schema
├── uploads/        # CCTV evidence
└── README.md
```

## 🚀 Run Locally

```bash
# Backend
cd backend
npm install
npm start
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```

**Frontend:** `http://localhost:5173`
**Backend:** `http://localhost:5000`

## 🗄️ Database

Import:

```text
database/schema.sql
```

Then configure `backend/.env` with your MySQL and AI settings.

## 🔑 Demo Accounts

| Role    | Email                    | Password     |
| ------- | ------------------------ | ------------ |
| Admin   | `admin@crisisgrid.com`   | `admin123`   |
| Citizen | `citizen@crisisgrid.com` | `citizen123` |

## 🔄 Workflow

```text
Emergency Report
      ↓
AI Analysis
      ↓
Severity + Resources
      ↓
Nearby CCTV Detection
      ↓
Evidence Capture
      ↓
Real-Time Alert
      ↓
Resource Dispatch
      ↓
Incident Resolution
```

## 🔒 Security

* JWT authentication
* bcrypt password hashing
* Role-based access control
* Environment-based secrets
* Protected admin operationsgit status