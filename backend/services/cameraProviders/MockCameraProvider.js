const fs = require('fs');
const path = require('path');
const CameraProvider = require('./CameraProvider');

class MockCameraProvider extends CameraProvider {
  constructor(storageDir = path.join(__dirname, '../../uploads/cctv')) {
    super();
    this.storageDir = storageDir;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async getCameraStatus(camera) {
    // If camera is explicitly marked OFFLINE in DB, respect it
    if (camera.status === 'OFFLINE') {
      return { online: false, status: 'OFFLINE', latencyMs: 0 };
    }
    return { online: true, status: 'ONLINE', latencyMs: 14 };
  }

  async captureSnapshot(camera, incidentId = null, timeWindow = null) {
    if (camera.status === 'OFFLINE') {
      throw new Error(`Camera ${camera.camera_id} is currently OFFLINE.`);
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const fileName = `cctv_${camera.camera_id}_inc_${incidentId || 'manual'}_${Date.now()}.svg`;
    const fullPath = path.join(this.storageDir, fileName);

    // Generate rich CCTV simulation SVG with time window if provided
    const svgContent = this._generateCctvSvg(camera, incidentId, timestamp, timeWindow);
    fs.writeFileSync(fullPath, svgContent, 'utf8');

    const relativePath = `/uploads/cctv/${fileName}`;
    return {
      filePath: relativePath,
      fileName,
      fileType: 'image/svg+xml',
      capturedAt: timestamp,
      captureStartTime: timeWindow?.startTime || timestamp,
      captureEndTime: timeWindow?.endTime || timestamp,
      durationSeconds: timeWindow?.durationSeconds || 30,
      streamReference: camera.stream_url || `/uploads/cctv/stream_${camera.camera_id}.m3u8`,
      simulated: true
    };
  }

  async captureVideoSegment(camera, incidentId = null, durationSeconds = 10) {
    // For mock, return snapshot representation with video metadata
    const snapshot = await this.captureSnapshot(camera, incidentId);
    return {
      ...snapshot,
      durationSeconds,
      isMockVideoSegment: true
    };
  }

  async getStream(camera) {
    return {
      streamUrl: camera.stream_url || `/uploads/cctv/stream_${camera.camera_id}.m3u8`,
      protocol: 'MOCK_HLS',
      simulated: true,
      note: 'Simulated CCTV stream feed for academic demonstration'
    };
  }

  _generateCctvSvg(camera, incidentId, timestamp, timeWindow = null) {
    const camId = camera.camera_id || 'CCTV-000';
    const camName = camera.name || 'Surveillance Feed';
    const location = camera.location || 'Metro Zone';
    const lat = camera.latitude ? Number(camera.latitude).toFixed(5) : '0.00000';
    const lng = camera.longitude ? Number(camera.longitude).toFixed(5) : '0.00000';
    const incLabel = incidentId ? `INCIDENT #INC-2026-${String(incidentId).padStart(4, '0')}` : 'MANUAL SURVEILLANCE CAPTURE';

    const windowInfo = timeWindow 
      ? `WINDOW: ${timeWindow.startTime?.substring(11, 19) || '19:10:22'} → ${timestamp.substring(11, 19)} → ${timeWindow.endTime?.substring(11, 19) || '19:10:52'} (${timeWindow.durationSeconds || 30}s)`
      : `TIMESTAMP: ${timestamp}`;

    // Unique visual hash based on camera and incident
    const hash = ((camId.charCodeAt(camId.length - 1) * 31) + (incidentId || 7)) % 360;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="100%" height="100%">
  <defs>
    <!-- Grid & Scanline Pattern -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 255, 170, 0.08)" stroke-width="1"/>
    </pattern>
    <linearGradient id="scanline" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1118"/>
      <stop offset="50%" stop-color="#111c26"/>
      <stop offset="100%" stop-color="#070c10"/>
    </linearGradient>
    <radialGradient id="lens" cx="50%" cy="50%" r="60%">
      <stop offset="60%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0, 0, 0, 0.75)"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="800" height="480" fill="url(#scanline)"/>
  <rect width="800" height="480" fill="url(#grid)"/>

  <!-- Stylized Surveillance City Wireframe Background -->
  <g opacity="0.35" stroke="#00e5ff" stroke-width="1.5" fill="none">
    <polygon points="120,380 200,260 280,380"/>
    <rect x="220" y="220" width="120" height="160"/>
    <line x1="240" y1="250" x2="320" y2="250"/>
    <line x1="240" y1="280" x2="320" y2="280"/>
    <line x1="240" y1="310" x2="320" y2="310"/>
    <polygon points="400,380 480,180 560,380"/>
    <rect x="520" y="240" width="160" height="140"/>
    <path d="M 0 380 Q 400 340 800 380" stroke="#00ffaa" stroke-width="2"/>
    <path d="M 0 410 Q 400 370 800 410" stroke="#00ffaa" stroke-width="1.5" stroke-dasharray="8 6"/>
  </g>

  <!-- Camera Lens Vignette -->
  <rect width="800" height="480" fill="url(#lens)"/>

  <!-- Optical Center Reticle / Crosshair -->
  <g stroke="#00ff88" stroke-width="1.2" opacity="0.8">
    <circle cx="400" cy="240" r="48" fill="none" stroke-dasharray="6 4"/>
    <circle cx="400" cy="240" r="4" fill="#00ff88"/>
    <line x1="330" y1="240" x2="380" y2="240"/>
    <line x1="420" y1="240" x2="470" y2="240"/>
    <line x1="400" y1="170" x2="400" y2="220"/>
    <line x1="400" y1="260" x2="400" y2="310"/>

    <!-- Corner Brackets -->
    <path d="M 60 70 L 40 70 L 40 90" fill="none" stroke-width="2.5"/>
    <path d="M 740 70 L 760 70 L 760 90" fill="none" stroke-width="2.5"/>
    <path d="M 40 390 L 40 410 L 60 410" fill="none" stroke-width="2.5"/>
    <path d="M 760 390 L 760 410 L 740 410" fill="none" stroke-width="2.5"/>
  </g>

  <!-- Realtime Telemetry Header -->
  <rect x="25" y="20" width="750" height="38" rx="6" fill="rgba(0, 0, 0, 0.75)" stroke="rgba(0, 255, 136, 0.4)" stroke-width="1"/>
  
  <!-- Red REC Dot -->
  <circle cx="45" cy="39" r="6" fill="#ff2a4b"/>
  <text x="58" y="43" fill="#ff2a4b" font-family="monospace" font-weight="bold" font-size="13">REC ● LIVE</text>
  <text x="160" y="43" fill="#00ff88" font-family="monospace" font-weight="bold" font-size="13">${camId}</text>
  <text x="245" y="43" fill="#ffffff" font-family="sans-serif" font-weight="600" font-size="12">${camName}</text>
  <text x="590" y="43" fill="#a0aec0" font-family="monospace" font-size="12">${timestamp}</text>

  <!-- Mandatory Prominent Academic Demo Label -->
  <g transform="translate(200, 75)">
    <rect x="0" y="0" width="400" height="26" rx="4" fill="rgba(234, 88, 12, 0.95)" stroke="#fff" stroke-width="1"/>
    <text x="200" y="17" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="11" text-anchor="middle" letter-spacing="0.5">
      DEMO CCTV FOOTAGE — SIMULATED SURVEILLANCE
    </text>
  </g>

  <!-- Incident Association Banner (Center Overlay) -->
  <g transform="translate(160, 185)">
    <rect x="0" y="0" width="480" height="110" rx="8" fill="rgba(6, 15, 25, 0.92)" stroke="rgba(0, 229, 255, 0.6)" stroke-width="1.5"/>
    <text x="240" y="26" fill="#00e5ff" font-family="monospace" font-weight="bold" font-size="12" text-anchor="middle" letter-spacing="1">
      AUTOMATED EMERGENCY CCTV CAPTURE
    </text>
    <text x="240" y="52" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="15" text-anchor="middle">
      ${incLabel}
    </text>
    <text x="240" y="74" fill="#38bdf8" font-family="monospace" font-weight="bold" font-size="11" text-anchor="middle">
      ${windowInfo}
    </text>
    <text x="240" y="96" fill="#64748b" font-family="monospace" font-size="10" text-anchor="middle">
      SECTOR: ${location} • LAT: ${lat} | LNG: ${lng}
    </text>
  </g>

  <!-- Telemetry Footer Bar -->
  <rect x="25" y="422" width="750" height="38" rx="6" fill="rgba(0, 0, 0, 0.8)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"/>
  <text x="45" y="445" fill="#38bdf8" font-family="monospace" font-size="11">FEED: 1080p @ 25 FPS</text>
  <text x="230" y="445" fill="#a0aec0" font-family="monospace" font-size="11">BITRATE: 2048 Kbps</text>
  <text x="420" y="445" fill="#00ff88" font-family="monospace" font-size="11">SECURITY: ENCRYPTED (ADMIN ONLY)</text>
  <text x="680" y="445" fill="#f59e0b" font-family="monospace" font-weight="bold" font-size="11">GRID-VERIFIED</text>
</svg>`;
  }
}

module.exports = MockCameraProvider;
