const path = require('path');
const db = require('../config/db');
const MockCameraProvider = require('./cameraProviders/MockCameraProvider');
const IPCameraProvider = require('./cameraProviders/IPCameraProvider');
const RTSPCameraProvider = require('./cameraProviders/RTSPCameraProvider');

const storageDir = path.join(__dirname, '../uploads/cctv');

// Initialize providers
const providers = {
  Mock: new MockCameraProvider(storageDir),
  IP: new IPCameraProvider(storageDir),
  Snapshot: new IPCameraProvider(storageDir),
  MJPEG: new IPCameraProvider(storageDir),
  RTSP: new RTSPCameraProvider(storageDir)
};

/**
 * Get the appropriate provider instance for a camera
 */
const getProvider = (camera) => {
  const type = camera?.type || 'Mock';
  return providers[type] || providers.Mock;
};

/**
 * Calculates Great-Circle Distance between two coordinates in Kilometers (Haversine Formula)
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 1000) / 1000; // Round to 3 decimal places (meters precision)
};

/**
 * Find all CCTV cameras within a given radius (default 1.0 km)
 */
const findNearbyCameras = async (latitude, longitude, radiusKm = 1.0) => {
  const [cameras] = await db.query('SELECT * FROM cameras ORDER BY name ASC');
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const nearby = [];
  for (const cam of cameras) {
    const camLat = parseFloat(cam.latitude);
    const camLng = parseFloat(cam.longitude);
    const distanceKm = calculateDistanceKm(lat, lng, camLat, camLng);

    if (distanceKm <= radiusKm) {
      nearby.push({
        ...cam,
        distance_km: distanceKm
      });
    }
  }

  // Sort closest first
  nearby.sort((a, b) => a.distance_km - b.distance_km);
  return nearby;
};

/**
 * Automated CCTV Proximity Detection and Evidence Capture Workflow
 * Triggered automatically when an incident is created
 */
const processIncidentCCTV = async (incidentId, latitude, longitude, io = null, incidentMeta = {}) => {
  const radiusKm = parseFloat(process.env.CCTV_SEARCH_RADIUS_KM) || 1.0;
  const formattedIncId = `INC-2026-${String(incidentId).padStart(5, '0')}`;

  // Configurable Pre/Post-Event Time Window
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

  console.log(`[CCTV Service] Processing Incident #${incidentId} (${formattedIncId}) at [${latitude}, ${longitude}], Radius: ${radiusKm} KM`);
  console.log(`[CCTV Service] Capture Window: ${timeWindow.startTime} -> ${timeWindow.endTime} (${timeWindow.durationSeconds}s)`);

  // Step 1: Emit search starting event
  if (io) {
    io.emit('cctv:searching', {
      incidentId: formattedIncId,
      numericIncidentId: Number(incidentId),
      radiusKm,
      coordinates: { latitude, longitude }
    });
  }

  // Step 2: Query nearby cameras
  const nearbyCameras = await findNearbyCameras(latitude, longitude, radiusKm);
  console.log(`[CCTV Service] Found ${nearbyCameras.length} cameras within ${radiusKm} KM of Incident #${incidentId}`);

  // Step 3: Emit cameras found event
  if (io) {
    io.emit('cctv:camera-found', {
      incidentId: formattedIncId,
      numericIncidentId: Number(incidentId),
      count: nearbyCameras.length,
      radiusKm,
      cameras: nearbyCameras.map(c => ({
        id: c.id,
        camera_id: c.camera_id,
        name: c.name,
        type: c.type,
        distance_km: c.distance_km,
        status: c.status
      }))
    });
  }

  const results = {
    incidentId,
    formattedIncId,
    camerasFound: nearbyCameras.length,
    evidenceList: [],
    timeWindow
  };

  // Step 4: Capture evidence from online cameras
  for (const camera of nearbyCameras) {
    const isOnline = camera.status === 'ONLINE';

    if (!isOnline) {
      console.log(`[CCTV Service] Camera ${camera.camera_id} is OFFLINE. Skipping auto-capture (CCTV unavailable).`);
      await db.query(
        `INSERT INTO incident_camera (incident_id, camera_id, distance_km, capture_status)
         VALUES (?, ?, ?, 'SKIPPED_OFFLINE')`,
        [incidentId, camera.id, camera.distance_km]
      );
      continue;
    }

    try {
      const provider = getProvider(camera);
      const snapshot = await provider.captureSnapshot(camera, incidentId, timeWindow);

      // Record in incident_camera junction
      await db.query(
        `INSERT INTO incident_camera (incident_id, camera_id, distance_km, capture_status, captured_at)
         VALUES (?, ?, ?, 'CAPTURED', NOW())`,
        [incidentId, camera.id, camera.distance_km]
      );

      // Record in cctv_evidence table with full time window & stream reference
      const streamRef = camera.stream_url || `/uploads/cctv/stream_${camera.camera_id}.m3u8`;
      const [evidenceInsert] = await db.query(
        `INSERT INTO cctv_evidence (
           incident_id, camera_id, file_path, file_type, 
           captured_at, capture_start_time, capture_end_time, 
           stream_reference, evidence_type, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'snapshot', 'captured')`,
        [
          incidentId,
          camera.id,
          snapshot.filePath,
          snapshot.fileType,
          snapshot.capturedAt,
          timeWindow.startTime,
          timeWindow.endTime,
          streamRef
        ]
      );

      const evidenceRecord = {
        evidenceId: evidenceInsert.insertId,
        incidentId: formattedIncId,
        numericIncidentId: Number(incidentId),
        cameraId: camera.camera_id,
        cameraDbId: camera.id,
        cameraName: camera.name,
        distance_km: camera.distance_km,
        filePath: snapshot.filePath,
        fileType: snapshot.fileType,
        capturedAt: snapshot.capturedAt,
        captureStartTime: timeWindow.startTime,
        captureEndTime: timeWindow.endTime,
        streamReference: streamRef,
        evidenceType: 'snapshot',
        status: 'captured',
        simulated: snapshot.simulated
      };

      results.evidenceList.push(evidenceRecord);

      // Step 5: Emit real-time evidence event specifically requested by Control Room
      if (io) {
        // High-priority dedicated event
        io.emit('cctv:incident-evidence', {
          incidentId: formattedIncId,
          numericIncidentId: Number(incidentId),
          cameraId: camera.camera_id,
          cameraName: camera.name,
          distance: camera.distance_km,
          captureTime: snapshot.capturedAt,
          captureStartTime: timeWindow.startTime,
          captureEndTime: timeWindow.endTime,
          evidenceType: 'snapshot',
          filePath: snapshot.filePath,
          streamReference: streamRef,
          status: 'captured',
          simulated: snapshot.simulated,
          incidentTitle: incidentMeta.title || `Incident #${incidentId}`,
          incidentType: incidentMeta.type || 'Emergency',
          incidentSeverity: incidentMeta.severity || 'High'
        });

        // Backward-compatible event
        io.emit('cctv:evidence-captured', {
          incidentId: formattedIncId,
          numericIncidentId: Number(incidentId),
          cameraId: camera.camera_id,
          cameraName: camera.name,
          distance: camera.distance_km,
          status: 'captured',
          filePath: snapshot.filePath,
          simulated: snapshot.simulated,
          capturedAt: snapshot.capturedAt
        });
      }

      console.log(`[CCTV Service] Evidence captured successfully for camera ${camera.camera_id} at ${camera.distance_km} KM`);
    } catch (err) {
      console.error(`[CCTV Service] Capture failed for camera ${camera.camera_id}:`, err.message);

      await db.query(
        `INSERT INTO incident_camera (incident_id, camera_id, distance_km, capture_status)
         VALUES (?, ?, ?, 'FAILED')`,
        [incidentId, camera.id, camera.distance_km]
      );

      if (io) {
        io.emit('cctv:evidence-captured', {
          incidentId: formattedIncId,
          numericIncidentId: Number(incidentId),
          cameraId: camera.camera_id,
          cameraName: camera.name,
          distance: camera.distance_km,
          status: 'failed',
          error: err.message
        });
      }
    }
  }

  // Step 6: If multiple cameras captured evidence, emit aggregate alert
  if (io && results.evidenceList.length > 1) {
    io.emit('cctv:multiple-evidence-captured', {
      incidentId: formattedIncId,
      numericIncidentId: Number(incidentId),
      count: results.evidenceList.length,
      cameras: results.evidenceList.map(e => e.cameraId),
      evidenceList: results.evidenceList,
      incidentTitle: incidentMeta.title || `Incident #${incidentId}`,
      incidentType: incidentMeta.type || 'Emergency',
      incidentSeverity: incidentMeta.severity || 'High'
    });
  }

  return results;
};

/**
 * Manual Snapshot Trigger (Admin testing)
 */
const captureManualSnapshot = async (cameraId, incidentId = null) => {
  const [cameras] = await db.query('SELECT * FROM cameras WHERE id = ? OR camera_id = ?', [cameraId, cameraId]);
  if (cameras.length === 0) {
    throw new Error(`Camera not found.`);
  }

  const camera = cameras[0];
  const provider = getProvider(camera);
  const snapshot = await provider.captureSnapshot(camera, incidentId);

  // If associated with an incident, persist to cctv_evidence
  if (incidentId) {
    const streamRef = camera.stream_url || `/uploads/cctv/stream_${camera.camera_id}.m3u8`;
    await db.query(
      `INSERT INTO cctv_evidence (
         incident_id, camera_id, file_path, file_type, 
         captured_at, capture_start_time, capture_end_time, 
         stream_reference, evidence_type, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'snapshot', 'captured')`,
      [
        incidentId,
        camera.id,
        snapshot.filePath,
        snapshot.fileType,
        snapshot.capturedAt,
        snapshot.capturedAt,
        snapshot.capturedAt,
        streamRef
      ]
    );
  }

  return {
    camera,
    snapshot
  };
};

module.exports = {
  calculateDistanceKm,
  findNearbyCameras,
  processIncidentCCTV,
  captureManualSnapshot,
  getProvider
};
