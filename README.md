# CrisisGrid AI — Emergency Resource Coordination Platform

> **Tagline**: AI-Powered Emergency Resource Coordination Platform  
> **Type**: College Full-Stack Web + Applied AI Project  
> **Status**: Production-Ready / Fully Tested Locally with Real-Time CCTV Integration

CrisisGrid AI connects citizens who report disasters in real time with an emergency control center that uses AI to analyze crisis severity, summarize the situation, and prescribe optimal emergency response units (Ambulances, Fire Trucks, Rescue Teams, Medical Kits, and Boats).

Now featuring **Automated CCTV Incident Proximity Detection & Evidence Capture** to verify on-ground disaster situations visually without delay.

---

## 🌟 Key Features

1. **Citizen Emergency Reporting**:
   - Simple, fast form with live 1-click geolocation landmark presets.
   - Live AI preview before submission.
   - Instant triage analysis upon submission.

2. **AI Emergency Decision Engine (`aiService.js`)**:
   - **Dual-Mode Architecture**: Supports live LLM API (Google Gemini / OpenAI format) when an API key is provided, with an automatic **intelligent keyword & heuristic rule-based fallback**.
   - Zero-configuration requirement: Runs 100% out of the box without any paid API key.
   - Categorizes incidents into: `Flood`, `Fire`, `Accident`, `Medical`, `Landslide`, `Other`.
   - Computes severity score: `Critical`, `High`, `Medium`, `Low`.
   - Generates a concise incident summary.
   - Recommends required first-responder units with recommended quantities.

3. **CCTV Camera Incident Integration (NEW)**:
   - **Automated Proximity Detection**: When an incident is logged, the backend calculates distance using the Haversine formula and searches for CCTV cameras within a configurable radius (default: `1.0 KM`).
   - **Automated Evidence Capture**: Requests and stores latest snapshots from all `ONLINE` cameras within the radius.
   - **Multi-Camera Abstraction (`CameraProvider`)**: Supports Mock, IP (HTTP/MJPEG), Snapshot, and RTSP stream adapters.
   - **Clear Simulation Labeling**: Simulated cameras are visibly stamped with **"DEMO CCTV — Simulated Evidence"** to ensure academic honesty.
   - **Real-Time Live Socket Streaming**: Emits `cctv:searching`, `cctv:camera-found`, and `cctv:evidence-captured` to notify operators in real time.
   - **Incident Evidence Gallery & Modal**: Full inspection of captured snapshots directly in the incident details view.
   - **CCTV Fleet Management (`/admin/cctv`)**: Admin CRUD, live feed monitoring, and on-demand manual snapshot triggers.

4. **Interactive Control Center (Admin Dashboard)**:
   - Real-time incident tracking on an interactive **Leaflet Map** using free OpenStreetMap tiles (no Google Maps API key required).
   - Custom color-coded incident pins based on severity and cyan pins for CCTV cameras.
   - Proximity highlight lines and 1.0 KM coverage radius circle when an incident is selected.
   - 4 Live Incident Metric Cards: Total Incidents, Critical, In Progress, Resolved.
   - Real-time synchronization via **Socket.IO** (`newIncident`, `incident:created`, `incidentUpdated`).
   - Search by keyword and filter by status and severity.

5. **Resource Management & Dispatch**:
   - Resource inventory tracking (Name, Type, Total Quantity, Available, Location, Status).
   - 1-Click Resource Assignment directly from the incident details page.
   - Automatic resource availability decrementing and status progression (`Reported` → `Assigned` → `In Progress` → `Resolved`).

6. **Authentication & Role-Based Access Control**:
   - Secure authentication using **JWT** and **bcrypt**.
   - Roles: `citizen` and `admin`.
   - 1-Click Quick Demo Login buttons on the Login page for instant demonstration.
   - Admin-only access to CCTV streams and surveillance evidence.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 (Vite) | Fast, modern component-based UI |
| **Styling** | Tailwind CSS | Clean, responsive, modern emergency-themed design |
| **Icons** | Lucide React | Lightweight SVG icons |
| **HTTP Client** | Axios | Interceptors for JWT auth & error handling |
| **Maps** | Leaflet + React-Leaflet | Open-source map with OpenStreetMap tiles |
| **Realtime** | Socket.IO Client | Instant WebSocket updates without page refresh |
| **Backend** | Node.js + Express.js | REST API server and WebSocket broker |
| **Database** | MySQL (via `mysql2/promise`) | Relational database with connection pooling |
| **Auth** | JWT + bcryptjs | Secure password hashing and token validation |
| **AI Service** | Gemini/OpenAI API + Fallback Engine | Multi-factor keyword & LLM emergency classifier |
| **CCTV Architecture** | CameraProvider Pattern | Extensible adapters for Mock, IP, and RTSP streams |

---

## 📂 Project Structure

```
CrisisGrid/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminSidebar.jsx        # Navigation sidebar with CCTV Monitoring link
│   │   │   ├── IncidentMap.jsx         # Leaflet Map with CCTV pins & 1KM radius circle
│   │   │   ├── Navbar.jsx              # Top navbar for public & citizen pages
│   │   │   ├── SeverityBadge.jsx       # Color-coded severity badge component
│   │   │   └── StatusBadge.jsx         # Color-coded status badge component
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # Global authentication state & session
│   │   │   └── SocketContext.jsx       # WebSocket connection provider
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx         # Page 1: Hero, workflow & entrypoints
│   │   │   ├── LoginPage.jsx           # Page 2: Auth form with 1-click demo buttons
│   │   │   ├── CitizenDashboard.jsx    # Page 3: Citizen incident tracker & metrics
│   │   │   ├── ReportEmergencyPage.jsx # Page 4: Form with live AI preview & submit
│   │   │   ├── ControlCenterPage.jsx   # Page 5: Main Admin dashboard, map & CCTV stats
│   │   │   ├── IncidentDetailsPage.jsx # Page 6: Dispatch, AI & Nearby CCTV Evidence
│   │   │   ├── ResourcesPage.jsx       # Page 7: Fleet & equipment CRUD inventory
│   │   │   └── CctvMonitoringPage.jsx  # Page 8: CCTV Fleet Management & live test
│   │   ├── services/
│   │   │   └── api.js                  # Centralized Axios API service layer
│   │   ├── App.jsx                     # Route definitions and auth guards
│   │   ├── main.jsx                    # React root entrypoint
│   │   └── index.css                   # Tailwind directives & map styling
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env
│
├── backend/
│   ├── config/
│   │   └── db.js                       # MySQL2 pool configuration
│   ├── controllers/
│   │   ├── authController.js           # Register, Login, GetMe
│   │   ├── incidentController.js       # Incident CRUD, CCTV auto-dispatch & Socket.IO
│   │   ├── resourceController.js       # Resource CRUD and assignment dispatch
│   │   ├── cameraController.js         # Camera CRUD, stats, and manual snapshot trigger
│   │   └── aiController.js             # Standalone AI analysis endpoint
│   ├── middleware/
│   │   └── auth.js                     # verifyToken, optionalAuth, requireAdmin
│   ├── routes/
│   │   ├── authRoutes.js               # /api/auth
│   │   ├── incidentRoutes.js           # /api/incidents
│   │   ├── resourceRoutes.js           # /api/resources
│   │   ├── cameraRoutes.js             # /api/cameras
│   │   └── aiRoutes.js                 # /api/ai
│   ├── services/
│   │   ├── aiService.js                # Dual-engine AI classifier & recommender
│   │   ├── cameraService.js            # Haversine distance, detection & capture
│   │   └── cameraProviders/
│   │       ├── CameraProvider.js       # Base abstraction class
│   │       ├── MockCameraProvider.js   # Simulated camera frame generator
│   │       ├── IPCameraProvider.js     # HTTP/MJPEG camera adapter
│   │       └── RTSPCameraProvider.js   # RTSP stream adapter & gateway hook
│   ├── server.js                       # Express + Socket.IO + Static CCTV uploads
│   ├── test-e2e.js                     # Core API test suite
│   ├── test-cctv.js                    # CCTV integration test suite
│   ├── uploads/cctv/                   # Saved surveillance snapshot evidence
│   ├── package.json
│   └── .env
│
├── database/
│   └── schema.sql                      # Complete MySQL database & seed script
│
└── README.md
```

---

## 🗄️ Database Setup (MySQL)

Execute the schema script to create and seed all tables:

```bash
# Using Node from the backend directory:
cd backend
node -e "const mysql = require('mysql2/promise'); const fs = require('fs'); (async () => { const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'YOUR_MYSQL_PASSWORD', multipleStatements: true }); await conn.query(fs.readFileSync('../database/schema.sql', 'utf8')); console.log('Database seeded successfully!'); await conn.end(); })();"
```

### Tables Created:
- **`users`**: User accounts with hashed passwords and role (`admin` or `citizen`).
- **`resources`**: Fleet units (`Ambulance`, `Fire Truck`, `Rescue Team`, `Medical Kit`, `Boat`).
- **`incidents`**: Emergency incidents with coordinates, AI summary, category, severity, status.
- **`incident_resources`**: Relational junction table mapping deployed resources to incidents.
- **`cameras`**: CCTV surveillance fleet (`camera_id`, `name`, `type`, `latitude`, `longitude`, `location`, `status`, `stream_url`, `snapshot_url`).
- **`incident_camera`**: Association table tracking nearby cameras, distance in KM, and capture status (`CAPTURED`, `SKIPPED_OFFLINE`, `FAILED`).
- **`cctv_evidence`**: Captured surveillance snapshots linked to incidents and cameras.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=crisisgrid
JWT_SECRET=crisisgrid_secret_key_2026
CLIENT_URL=http://localhost:5173
AI_API_KEY=
CCTV_SEARCH_RADIUS_KM=1.0
CCTV_STORAGE_DIR=./uploads/cctv
CCTV_PRE_EVENT_SECONDS=10
CCTV_POST_EVENT_SECONDS=20
```
*(Leave `AI_API_KEY` blank to use the built-in rule-based AI engine)*

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 How to Run the Application

### 1. Start the Backend Server

```bash
cd backend
npm start
# Server starts at http://localhost:5000
```

### 2. Start the Frontend Dev Server

```bash
cd frontend
npm run dev
# App opens at http://localhost:5173
```

### 3. Run Automated Tests

```bash
cd backend
npm test
# Runs both test-e2e.js (core platform) and test-cctv.js (CCTV integration)
```

---

## 👤 Demo Login Credentials

The database comes pre-seeded with these demo accounts:

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `admin@crisisgrid.com` | `admin123` | Full Control Center, Map, CCTV Fleet, Resource Dispatch |
| **Citizen** | `citizen@crisisgrid.com` | `citizen123` | Citizen Dashboard, Incident Reporting, Report History |

> 💡 **Tip:** On the Login page, click **"Fill Admin"** or **"Fill Citizen"** to automatically fill credentials in one click!

---

## 📹 CCTV Camera Integration Details

### Camera Provider Architecture

All camera integrations implement the abstract `CameraProvider` interface:

```
                  CameraProvider (Base Class)
                 /             |            \
     MockCameraProvider  IPCameraProvider  RTSPCameraProvider
      (Academic Demo)     (HTTP/MJPEG)       (RTSP Gateway)
```

Methods defined:
- `getCameraStatus(camera)`: Evaluates network reachability and online status.
- `captureSnapshot(camera, incidentId)`: Fetches or synthesizes visual evidence.
- `captureVideoSegment(camera, incidentId, duration)`: Records short video clip.
- `getStream(camera)`: Exposes client-compatible stream metadata.
- `disconnect(camera)`: Closes active video handles cleanly.

### How to Connect a Real Camera

1. **IP Camera (HTTP Snapshot / MJPEG)**:
   - Go to `/admin/cctv` and click **"Register Camera"**.
   - Set **Type** to `IP` or `Snapshot`.
   - Enter your camera's snapshot URL, for example: `http://admin:password@192.168.1.120:80/cgi-bin/snapshot.cgi` or `http://192.168.1.120/jpg/image.jpg`.
   - Provide GPS coordinates (lat, lng).
   - Click Save. When an incident occurs within radius, `IPCameraProvider` will fetch the snapshot via HTTP.

2. **RTSP Camera**:
   - Set **Type** to `RTSP`.
   - Enter your camera's RTSP URL, for example: `rtsp://admin:password@192.168.1.120:554/h264Preview_01_main`.
   - *Note on Browser Playback*: Modern web browsers cannot natively render raw RTSP. In a production environment with FFmpeg installed, `RTSPCameraProvider` hooks into a stream gateway (e.g. RTSP-to-HLS or WebRTC) to transcode the video for HTML5 playback without browser plugins.

3. **Demo / Mock Camera**:
   - Set **Type** to `Mock`.
   - Generates simulated 1080p surveillance frames stamped with telemetry, timestamp, and incident association.

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` — Register a new citizen or admin account
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Get current logged-in user profile

### Incidents
- `GET /api/incidents` — List all incidents (supports filters: `status`, `type`, `severity`)
- `GET /api/incidents/:id` — Get incident with assigned resources, AI recommendations, nearby CCTV cameras, and visual evidence
- `POST /api/incidents` — Submit emergency report (triggers AI triage and automated CCTV proximity detection)
- `PUT /api/incidents/:id/status` — Update status (`Reported` → `Assigned` → `In Progress` → `Resolved`)
- `DELETE /api/incidents/:id` — Delete an incident (Admin only)
- `POST /api/incidents/:id/resources` — Assign resource to incident

### CCTV Cameras
- `GET /api/cameras` — List all surveillance cameras (Admin only)
- `GET /api/cameras/stats` — Summary metrics: total, online, offline, total evidence (Admin only)
- `GET /api/cameras/:id` — Get camera details and recent captures (Admin only)
- `POST /api/cameras` — Register a new CCTV camera (Admin only)
- `PUT /api/cameras/:id` — Update camera metadata or status (Admin only)
- `DELETE /api/cameras/:id` — Remove camera from fleet (Admin only)
- `POST /api/cameras/:id/snapshot` — Trigger on-demand manual snapshot (Admin only)

### Real-time Socket.IO Events
- `incident:created` & `newIncident`: Broadcast when a new emergency is logged.
- `cctv:searching`: Broadcast when nearby camera detection begins.
- `cctv:camera-found`: Broadcast with count and list of cameras found within radius.
- `cctv:evidence-captured`: Broadcast when an evidence snapshot is captured and stored.
- `incidentUpdated`: Broadcast when status or resource assignment changes.

---

## 🔒 Security & Privacy

- **Strict Access Control**: All `/api/cameras` routes and evidence inspection endpoints require `verifyToken` and `requireAdmin`.
- **No Citizen Exposure**: Citizen users cannot view raw CCTV footage or camera fleet inventories.
- **Secure Credentials**: Camera passwords are not hardcoded in the frontend or database scripts.

---

## 🔄 End-to-End Workflow Demonstration

1. **Citizen reports emergency**:  
   Citizen files an incident at `12.9716, 77.5946` (Riverside Colony) with description *"Rising flood waters near the bridge"*.
2. **AI processes incident**:  
   AI classifies as `Flood`, assigns `Critical` severity, and recommends rescue units.
3. **Automated CCTV proximity scan**:  
   Backend calculates distance: `CCTV-001` is 0.26 KM away, `CCTV-002` is 0.48 KM away.
4. **Evidence capture**:  
   Because both cameras are `ONLINE`, `cameraService` requests visual snapshots, saves them to `uploads/cctv/`, and creates `cctv_evidence` records.
5. **Real-time broadcast**:  
   Socket.IO notifies the Admin Control Center without refreshing.
6. **Admin reviews & coordinates**:  
   Admin opens Incident Details, reviews the AI recommendation, inspects the CCTV evidence frames, and dispatches units.
#   C r i s i s s G r i d  
 