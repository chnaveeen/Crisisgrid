const path = require('path');
const db = require('../config/db');
const { analyzeIncident, analyzeCctvEmergency } = require('./aiService');
const { getProvider, findNearbyCameras, calculateDistanceKm } = require('./cameraService');

// Scenario presets for autonomous vision analytics
const CAMERA_PRESETS = {
  'CCTV-001': {
    type: 'Flood',
    severity: 'Critical',
    title: '[CCTV AI ALERT] Water Level Surge at Riverside Pier',
    description: 'Autonomous CCTV computer vision detected river embankment water level exceeding critical danger threshold. Flash flooding overtopping roadway with multiple trapped vehicles.'
  },
  'CCTV-002': {
    type: 'Accident',
    severity: 'High',
    title: '[CCTV AI ALERT] Multi-Vehicle Collision at Crossroads',
    description: 'Surveillance motion analysis detected rapid vehicle deceleration and structural collision at Ward 4 main crossroads intersection. Roadway blocked.'
  },
  'CCTV-003': {
    type: 'Fire',
    severity: 'Critical',
    title: '[CCTV AI ALERT] Dense Smoke & Fire Outbreak at Tech Park',
    description: 'Thermal analysis and optical smoke detection sensor triggered on camera CCTV-003 at Sector 2 warehouse perimeter. Flames spreading rapidly.'
  },
  'CCTV-005': {
    type: 'Accident',
    severity: 'High',
    title: '[CCTV AI ALERT] Highway Express Toll Barrier Collision',
    description: 'Vehicle impact and barrier breach detected on CCTV-005 optical feed at Mile 14 Toll Booth. Traffic halt and vehicle hazard.'
  },
  'CCTV-006': {
    type: 'Fire',
    severity: 'High',
    title: '[CCTV AI ALERT] Vehicle Engine Fire on Overpass',
    description: 'Thermal anomaly detected on South Ring Bypass walkway camera. Commercial delivery vehicle engulfed in flames on shoulder lane.'
  },
  'CCTV-007': {
    type: 'Landslide',
    severity: 'Critical',
    title: '[CCTV AI ALERT] Mountain Slope Rockfall & Roadway Block',
    description: 'Computer vision optical flow detected rapid slope soil failure and boulder debris field crossing Pine Hill Ridge mountain access road.'
  },
  'CCTV-008': {
    type: 'Medical',
    severity: 'Medium',
    title: '[CCTV AI ALERT] Crowd Distress & Medical Emergency at Arena',
    description: 'Automated crowd density and distress detection triggered at Metro Sports Stadium east entrance gate. Individual collapsed.'
  }
};

/**
 * Autonomous CCTV Emergency Detection Pipeline:
 * Existing CCTV → AI Detection → Emergency Event → Backend → Control Room Alert
 *
 * 1. CCTV camera detects an emergency condition & captures evidence frame.
 * 2. CCTV sends the frame/video and telemetry to the AI detection service.
 * 3. AI analyzes it and identifies:
 *    - Event type
 *    - Severity
 *    - Short description
 *    - Location
 * 4. AI sends the result to the CrisisGrid backend.
 * 5. Backend automatically creates an Incident ID (e.g. INC-2026-XXXXX).
 * 6. Save the incident and CCTV evidence in MySQL database.
 * 7. Backend immediately sends an emergency alert to Control Room via Socket.IO.
 */
const detectEmergencyOnCamera = async (cameraIdentifier, customEvent = {}, io = null) => {
  // 1. Locate camera in database
  const [cameras] = await db.query(
    'SELECT * FROM cameras WHERE id = ? OR camera_id = ?',
    [cameraIdentifier, cameraIdentifier]
  );

  if (cameras.length === 0) {
    throw new Error(`Camera "${cameraIdentifier}" not found.`);
  }

  const camera = cameras[0];

  if (camera.status === 'OFFLINE') {
    throw new Error(`Camera ${camera.camera_id} is currently OFFLINE. Cannot run automated vision detection.`);
  }

  console.log(`[CCTV Detection Engine] Step 1: Camera ${camera.camera_id} (${camera.name}) optical trigger activated.`);

  // 2. Compute pre/post-event capture window
  const preSeconds = parseInt(process.env.CCTV_PRE_EVENT_SECONDS, 10) || 10;
  const postSeconds = parseInt(process.env.CCTV_POST_EVENT_SECONDS, 10) || 20;
  const now = new Date();
  const startTime = new Date(now.getTime() - preSeconds * 1000);
  const endTime = new Date(now.getTime() + postSeconds * 1000);

  const timeWindow = {
    incidentTime: now.toISOString().replace('T', ' ').substring(0, 19),
    startTime: startTime.toISOString().replace('T', ' ').substring(0, 19),
    endTime: endTime.toISOString().replace('T', ' ').substring(0, 19),
    preSeconds,
    postSeconds,
    durationSeconds: preSeconds + postSeconds
  };

  // 3. Existing CCTV extracts the live evidence frame/video from camera provider
  const provider = getProvider(camera);
  const snapshot = await provider.captureSnapshot(camera, 'auto_cctv', timeWindow);
  const streamRef = camera.stream_url || `/uploads/cctv/stream_${camera.camera_id}.m3u8`;

  console.log(`[CCTV Detection Engine] Step 2: CCTV frame captured (${snapshot.fileName}). Sending to AI Detection Service...`);

  // 4. Send detected event/frame/video to the AI Detection Service
  const aiResult = await analyzeCctvEmergency({
    camera,
    frame: snapshot,
    streamUrl: streamRef,
    visualTelemetry: {
      eventHint: customEvent.eventHint || (CAMERA_PRESETS[camera.camera_id]?.type) || '',
      opticalTrigger: 'SURVEILLANCE_OPTICAL_SURGE'
    },
    rawEvent: customEvent
  });

  console.log(`[CCTV Detection Engine] Step 3: AI Analysis Completed:`, {
    type: aiResult.eventType,
    severity: aiResult.severity,
    location: aiResult.location,
    source: aiResult.source
  });

  const finalType = aiResult.eventType;
  const finalSeverity = aiResult.severity;
  const finalDescription = aiResult.shortDescription;
  const finalLocation = aiResult.location || camera.location;
  const finalTitle = customEvent.title || `[CCTV AI ALERT] ${finalType} at ${finalLocation}`;
  const aiSummary = finalDescription;

  // 5. Backend automatically inserts new incident into MySQL
  const lat = parseFloat(camera.latitude);
  const lng = parseFloat(camera.longitude);

  const [insertResult] = await db.query(
    `INSERT INTO incidents (
       title, description, type, severity, location, latitude, longitude,
       status, ai_summary, detection_source, detection_camera_id, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Reported', ?, 'CCTV_AUTO_DETECTION', ?, NULL)`,
    [
      finalTitle,
      finalDescription,
      finalType,
      finalSeverity,
      finalLocation,
      lat,
      lng,
      aiSummary,
      camera.id
    ]
  );

  const newIncidentId = insertResult.insertId;
  const formattedIncId = `INC-2026-${String(newIncidentId).padStart(5, '0')}`;

  console.log(`[CCTV Detection Engine] Step 4: Backend generated Incident #${newIncidentId} (${formattedIncId})`);

  // 6. Save CCTV evidence and associate detecting camera in MySQL database
  await db.query(
    `INSERT INTO incident_camera (incident_id, camera_id, distance_km, capture_status, captured_at)
     VALUES (?, ?, 0.000, 'CAPTURED', NOW())`,
    [newIncidentId, camera.id]
  );

  // 7. Persist CCTV evidence in database
  const [evidenceInsert] = await db.query(
    `INSERT INTO cctv_evidence (
       incident_id, camera_id, file_path, file_type,
       captured_at, capture_start_time, capture_end_time,
       stream_reference, evidence_type, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'snapshot', 'captured')`,
    [
      newIncidentId,
      camera.id,
      snapshot.filePath,
      snapshot.fileType,
      snapshot.capturedAt,
      timeWindow.startTime,
      timeWindow.endTime,
      streamRef
    ]
  );

  // 9. Scan for other nearby cameras within 1.0 KM to capture supplementary angles
  const radiusKm = parseFloat(process.env.CCTV_SEARCH_RADIUS_KM) || 1.0;
  const nearbyCams = await findNearbyCameras(lat, lng, radiusKm);
  const secondaryEvidence = [];

  for (const secondaryCam of nearbyCams) {
    if (secondaryCam.id === camera.id) continue; // Already captured detecting camera
    if (secondaryCam.status !== 'ONLINE') {
      await db.query(
        `INSERT INTO incident_camera (incident_id, camera_id, distance_km, capture_status)
         VALUES (?, ?, ?, 'SKIPPED_OFFLINE')`,
        [newIncidentId, secondaryCam.id, secondaryCam.distance_km]
      );
      continue;
    }

    try {
      const secProvider = getProvider(secondaryCam);
      const secSnapshot = await secProvider.captureSnapshot(secondaryCam, newIncidentId, timeWindow);

      await db.query(
        `INSERT INTO incident_camera (incident_id, camera_id, distance_km, capture_status, captured_at)
         VALUES (?, ?, ?, 'CAPTURED', NOW())`,
        [newIncidentId, secondaryCam.id, secondaryCam.distance_km]
      );

      const secStreamRef = secondaryCam.stream_url || `/uploads/cctv/stream_${secondaryCam.camera_id}.m3u8`;
      await db.query(
        `INSERT INTO cctv_evidence (
           incident_id, camera_id, file_path, file_type,
           captured_at, capture_start_time, capture_end_time,
           stream_reference, evidence_type, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'snapshot', 'captured')`,
        [
          newIncidentId,
          secondaryCam.id,
          secSnapshot.filePath,
          secSnapshot.fileType,
          secSnapshot.capturedAt,
          timeWindow.startTime,
          timeWindow.endTime,
          secStreamRef
        ]
      );

      secondaryEvidence.push({
        cameraId: secondaryCam.camera_id,
        cameraName: secondaryCam.name,
        distance_km: secondaryCam.distance_km,
        filePath: secSnapshot.filePath
      });
    } catch (secErr) {
      console.warn(`[CCTV Detection Engine] Secondary capture failed for ${secondaryCam.camera_id}:`, secErr.message);
    }
  }

  // 10. Fetch full incident structure
  const [createdIncidents] = await db.query(`
    SELECT 
      i.id,
      i.title,
      i.description,
      i.type,
      i.severity,
      i.location,
      CAST(i.latitude AS DOUBLE) as latitude,
      CAST(i.longitude AS DOUBLE) as longitude,
      i.status,
      i.ai_summary,
      i.detection_source,
      i.detection_camera_id,
      i.created_by,
      i.created_at,
      'CCTV AI Vision Analytics' as reporter_name
    FROM incidents i
    WHERE i.id = ?
  `, [newIncidentId]);

  const createdIncident = createdIncidents[0];
  createdIncident.incident_id = formattedIncId;
  createdIncident.detection_camera_code = camera.camera_id;
  createdIncident.detection_camera_name = camera.name;
  createdIncident.recommendedResources = aiResult.recommendedResources;
  createdIncident.cctvEvidence = [
    {
      evidenceId: evidenceInsert.insertId,
      cameraId: camera.camera_id,
      cameraName: camera.name,
      filePath: snapshot.filePath,
      capturedAt: snapshot.capturedAt,
      captureStartTime: timeWindow.startTime,
      captureEndTime: timeWindow.endTime,
      streamReference: streamRef,
      distance_km: 0.000
    },
    ...secondaryEvidence
  ];

  const primaryEvidenceData = {
    snapshotUrl: snapshot.filePath,
    filePath: snapshot.filePath,
    fileName: snapshot.fileName,
    capturedAt: snapshot.capturedAt,
    preEventTime: timeWindow.startTime,
    postEventTime: timeWindow.endTime,
    streamReference: streamRef
  };

  // 11. Emit Real-time Socket.IO Events to Control Room
  if (io) {
    // Standardized Unified Emergency Alert Payload (Symmetric with Citizen reporting)
    const unifiedAlert = {
      alertType: 'EMERGENCY_ALERT',
      alertId: `ALT-${Date.now()}`,
      incidentId: formattedIncId,
      numericIncidentId: newIncidentId,
      source: 'CCTV',
      sourceLabel: 'CCTV Vision Analytics',
      reporterName: `CCTV Vision (${camera.camera_id})`,
      type: finalType,
      severity: finalSeverity,
      title: finalTitle,
      description: finalDescription,
      location: finalLocation,
      latitude: lat,
      longitude: lng,
      time: snapshot.capturedAt,
      aiSummary: finalDescription,
      recommendedResources: aiResult.recommendedResources,
      cctvEvidence: {
        hasEvidence: true,
        cameraId: camera.camera_id,
        cameraName: camera.name,
        filePath: snapshot.filePath,
        captureTime: snapshot.capturedAt,
        captureStartTime: timeWindow.startTime,
        captureEndTime: timeWindow.endTime,
        streamReference: streamRef,
        distance_km: 0.000
      },
      incident: createdIncident
    };

    // Unified alert for all sources
    io.emit('emergency:alert', unifiedAlert);

    // Dedicated Autonomous CCTV Detection Alert (Backward-compatible)
    io.emit('cctv:auto-detection-alert', {
      alertType: 'CCTV_AUTONOMOUS_EMERGENCY_DETECTED',
      incidentId: formattedIncId,
      numericIncidentId: newIncidentId,
      cameraId: camera.camera_id,
      cameraName: camera.name,
      cameraLocation: finalLocation,
      latitude: lat,
      longitude: lng,
      eventType: finalType,
      severity: finalSeverity,
      title: finalTitle,
      description: finalDescription,
      evidenceFilePath: snapshot.filePath,
      evidence: primaryEvidenceData,
      streamReference: streamRef,
      captureTime: snapshot.capturedAt,
      captureStartTime: timeWindow.startTime,
      captureEndTime: timeWindow.endTime,
      detectionSource: 'CCTV_AUTO_DETECTION',
      aiSummary: finalDescription,
      recommendedResources: aiResult.recommendedResources,
      secondaryEvidenceCount: secondaryEvidence.length,
      incident: createdIncident
    });

    createdIncident.assigned_resource_count = 0;

    // B. Real-time Incident updates for tactical map & tables
    io.emit('incident:new', createdIncident);
    io.emit('newIncident', createdIncident);
    io.emit('incident:created', {
      incidentId: formattedIncId,
      numericIncidentId: newIncidentId,
      incident: createdIncident
    });

    // C. Real-time CCTV Evidence event
    io.emit('cctv:incident-evidence', {
      incidentId: formattedIncId,
      numericIncidentId: newIncidentId,
      cameraId: camera.camera_id,
      cameraName: camera.name,
      distance: 0.000,
      captureTime: snapshot.capturedAt,
      captureStartTime: timeWindow.startTime,
      captureEndTime: timeWindow.endTime,
      evidenceType: 'snapshot',
      filePath: snapshot.filePath,
      snapshotUrl: snapshot.filePath,
      streamReference: streamRef,
      status: 'captured',
      simulated: snapshot.simulated,
      incidentTitle: finalTitle,
      incidentType: finalType,
      incidentSeverity: finalSeverity
    });
  }

  return {
    success: true,
    incidentId: formattedIncId,
    numericIncidentId: newIncidentId,
    camera: {
      id: camera.id,
      cameraId: camera.camera_id,
      name: camera.name,
      location: camera.location
    },
    incident: createdIncident,
    cctvEvidence: primaryEvidenceData,
    evidence: {
      primary: snapshot.filePath,
      snapshotUrl: snapshot.filePath,
      secondaryCount: secondaryEvidence.length
    }
  };
};

// State tracking for autonomous surveillance worker
let surveillanceWorkerTimer = null;
let surveillanceWorkerStartTimeout = null;
let isWorkerRunning = false;
let surveillanceStats = {
  active: false,
  lastScanTime: null,
  totalEventsDetected: 0,
  monitoredCamerasCount: 0,
  lastEventSummary: null
};

/**
 * Autonomous CCTV Surveillance Background Daemon
 * Automatically monitors online surveillance cameras and detects emergencies without human action.
 * Sends detected stream/frame to AI -> AI analyzes -> Backend creates incident -> Control Room receives alert.
 */
const startAutonomousSurveillanceWorker = (ioInstance, options = {}) => {
  if (surveillanceWorkerTimer || surveillanceWorkerStartTimeout) {
    console.log('[CCTV Surveillance Daemon] Worker is already running.');
    return;
  }

  const intervalMs = options.intervalMs || parseInt(process.env.CCTV_SCAN_INTERVAL_MS, 10) || 120000;
  const startDelayMs = options.startDelayMs !== undefined ? options.startDelayMs : 25000;

  isWorkerRunning = true;
  surveillanceStats.active = true;
  console.log(`[CCTV Surveillance Daemon] Starting background worker (Cycle: ${intervalMs / 1000}s, Delay: ${startDelayMs / 1000}s)...`);

  const runAutonomousScan = async () => {
    if (!isWorkerRunning) return;
    try {
      surveillanceStats.lastScanTime = new Date().toISOString();

      const [onlineCameras] = await db.query(
        "SELECT * FROM cameras WHERE status = 'ONLINE' ORDER BY RAND()"
      );

      surveillanceStats.monitoredCamerasCount = onlineCameras.length;

      if (onlineCameras.length === 0) {
        console.log('[CCTV Surveillance Daemon] No online cameras found to monitor.');
        return;
      }

      // Pick an active camera node
      const targetCamera = onlineCameras[0];
      console.log(`[CCTV Surveillance Daemon] Optical scan triggered on camera ${targetCamera.camera_id} (${targetCamera.name})...`);

      const result = await detectEmergencyOnCamera(targetCamera.id, {}, ioInstance);
      surveillanceStats.totalEventsDetected += 1;
      surveillanceStats.lastEventSummary = {
        incidentId: result.incidentId,
        camera: targetCamera.camera_id,
        type: result.incident?.type,
        time: new Date().toISOString()
      };

      console.log(`[CCTV Surveillance Daemon] 🚨 Autonomous emergency detected! Incident ${result.incidentId} generated & alerted to Control Room.`);
    } catch (scanErr) {
      console.warn('[CCTV Surveillance Daemon] Scan cycle warning:', scanErr.message);
    }
  };

  surveillanceWorkerStartTimeout = setTimeout(() => {
    surveillanceWorkerStartTimeout = null;
    runAutonomousScan();
    surveillanceWorkerTimer = setInterval(runAutonomousScan, intervalMs);
  }, startDelayMs);
};

const stopAutonomousSurveillanceWorker = () => {
  if (surveillanceWorkerStartTimeout) {
    clearTimeout(surveillanceWorkerStartTimeout);
    surveillanceWorkerStartTimeout = null;
  }
  if (surveillanceWorkerTimer) {
    clearInterval(surveillanceWorkerTimer);
    surveillanceWorkerTimer = null;
  }
  isWorkerRunning = false;
  surveillanceStats.active = false;
  console.log('[CCTV Surveillance Daemon] Background worker stopped.');
};

const getSurveillanceStatus = () => ({
  ...surveillanceStats
});

const triggerAutonomousSurveillanceTick = async (ioInstance, cameraIdentifier = null) => {
  let targetId = cameraIdentifier;
  if (!targetId) {
    const [online] = await db.query("SELECT id FROM cameras WHERE status = 'ONLINE' ORDER BY RAND() LIMIT 1");
    if (online.length > 0) targetId = online[0].id;
  }
  if (!targetId) throw new Error('No online surveillance camera available.');

  return await detectEmergencyOnCamera(targetId, {}, ioInstance);
};

module.exports = {
  detectEmergencyOnCamera,
  startAutonomousSurveillanceWorker,
  stopAutonomousSurveillanceWorker,
  getSurveillanceStatus,
  triggerAutonomousSurveillanceTick,
  CAMERA_PRESETS
};
