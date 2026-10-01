const db = require('../config/db');
const { captureManualSnapshot, getProvider } = require('../services/cameraService');

// GET /api/cameras
const getAllCameras = async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = 'SELECT * FROM cameras WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY camera_id ASC';
    const [cameras] = await db.query(query, params);

    return res.json({
      success: true,
      count: cameras.length,
      data: cameras.map(c => ({
        ...c,
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude)
      }))
    });
  } catch (err) {
    console.error('[Get All Cameras Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch cameras.' });
  }
};

// GET /api/cameras/stats
const getCameraStats = async (req, res) => {
  try {
    const [totalRows] = await db.query('SELECT COUNT(*) as total FROM cameras');
    const [onlineRows] = await db.query('SELECT COUNT(*) as onlineCount FROM cameras WHERE status = "ONLINE"');
    const [offlineRows] = await db.query('SELECT COUNT(*) as offlineCount FROM cameras WHERE status = "OFFLINE"');
    const [evidenceRows] = await db.query('SELECT COUNT(*) as totalEvidence FROM cctv_evidence');

    return res.json({
      success: true,
      data: {
        total: totalRows[0].total,
        online: onlineRows[0].onlineCount,
        offline: offlineRows[0].offlineCount,
        totalEvidence: evidenceRows[0].totalEvidence,
        activeStreams: onlineRows[0].onlineCount
      }
    });
  } catch (err) {
    console.error('[Get Camera Stats Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to load camera statistics.' });
  }
};

// GET /api/cameras/:id
const getCameraById = async (req, res) => {
  try {
    const { id } = req.params;
    const [cameras] = await db.query('SELECT * FROM cameras WHERE id = ? OR camera_id = ?', [id, id]);

    if (cameras.length === 0) {
      return res.status(404).json({ success: false, message: 'Camera not found.' });
    }

    const camera = cameras[0];
    camera.latitude = parseFloat(camera.latitude);
    camera.longitude = parseFloat(camera.longitude);

    // Fetch recent evidence from this camera
    const [evidence] = await db.query(
      `SELECT ce.*, i.title as incident_title 
       FROM cctv_evidence ce
       LEFT JOIN incidents i ON ce.incident_id = i.id
       WHERE ce.camera_id = ?
       ORDER BY ce.captured_at DESC LIMIT 5`,
      [camera.id]
    );

    camera.recentEvidence = evidence;

    return res.json({ success: true, data: camera });
  } catch (err) {
    console.error('[Get Camera By ID Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch camera details.' });
  }
};

// POST /api/cameras (Admin)
const createCamera = async (req, res) => {
  try {
    const { camera_id, name, type, latitude, longitude, location, status, stream_url, snapshot_url } = req.body;

    if (!camera_id || !name || !location || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'camera_id, name, location, latitude, and longitude are required.'
      });
    }

    const camType = type || 'Mock';
    const camStatus = status || 'ONLINE';

    const [result] = await db.query(
      `INSERT INTO cameras (camera_id, name, type, latitude, longitude, location, status, stream_url, snapshot_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [camera_id.trim().toUpperCase(), name.trim(), camType, parseFloat(latitude), parseFloat(longitude), location.trim(), camStatus, stream_url || null, snapshot_url || null]
    );

    const [created] = await db.query('SELECT * FROM cameras WHERE id = ?', [result.insertId]);

    const io = req.app.get('io');
    if (io) {
      io.emit('cctv:camera-updated', created[0]);
    }

    return res.status(201).json({
      success: true,
      message: `Camera ${camera_id} registered successfully.`,
      data: created[0]
    });
  } catch (err) {
    console.error('[Create Camera Error]:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A camera with this camera_id already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to register camera.' });
  }
};

// PUT /api/cameras/:id (Admin)
const updateCamera = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, latitude, longitude, location, status, stream_url, snapshot_url } = req.body;

    const [exists] = await db.query('SELECT * FROM cameras WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Camera not found.' });
    }

    const current = exists[0];
    const newName = name !== undefined ? name.trim() : current.name;
    const newType = type !== undefined ? type : current.type;
    const newLat = latitude !== undefined ? parseFloat(latitude) : current.latitude;
    const newLng = longitude !== undefined ? parseFloat(longitude) : current.longitude;
    const newLoc = location !== undefined ? location.trim() : current.location;
    const newStatus = status !== undefined ? status : current.status;
    const newStream = stream_url !== undefined ? stream_url : current.stream_url;
    const newSnap = snapshot_url !== undefined ? snapshot_url : current.snapshot_url;

    await db.query(
      `UPDATE cameras 
       SET name = ?, type = ?, latitude = ?, longitude = ?, location = ?, status = ?, stream_url = ?, snapshot_url = ?
       WHERE id = ?`,
      [newName, newType, newLat, newLng, newLoc, newStatus, newStream, newSnap, id]
    );

    const [updated] = await db.query('SELECT * FROM cameras WHERE id = ?', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('cctv:camera-updated', updated[0]);
    }

    return res.json({
      success: true,
      message: `Camera ${updated[0].camera_id} updated successfully.`,
      data: updated[0]
    });
  } catch (err) {
    console.error('[Update Camera Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to update camera.' });
  }
};

// DELETE /api/cameras/:id (Admin)
const deleteCamera = async (req, res) => {
  try {
    const { id } = req.params;
    const [exists] = await db.query('SELECT id, camera_id FROM cameras WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Camera not found.' });
    }

    await db.query('DELETE FROM cameras WHERE id = ?', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('cctv:camera-deleted', { id: Number(id) });
    }

    return res.json({ success: true, message: `Camera ${exists[0].camera_id} deleted successfully.` });
  } catch (err) {
    console.error('[Delete Camera Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete camera.' });
  }
};

// POST /api/cameras/:id/snapshot (Admin manual snapshot test)
const triggerManualSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    const { incidentId } = req.body;

    const result = await captureManualSnapshot(id, incidentId || null);

    return res.json({
      success: true,
      message: `Manual snapshot captured for camera ${result.camera.camera_id}.`,
      data: {
        cameraId: result.camera.camera_id,
        name: result.camera.name,
        snapshot: result.snapshot
      }
    });
  } catch (err) {
    console.error('[Manual Snapshot Error]:', err);
    return res.status(500).json({ success: false, message: err.message || 'Snapshot capture failed.' });
  }
};

// POST /api/cameras/:id/detect-incident (Autonomous CCTV detection trigger)
const triggerCctvAutoDetection = async (req, res) => {
  try {
    const { id } = req.params;
    const customEvent = req.body || {};
    const io = req.app.get('io');

    const { detectEmergencyOnCamera } = require('../services/cctvDetectionService');
    const result = await detectEmergencyOnCamera(id, customEvent, io);

    return res.status(201).json({
      success: true,
      message: `CCTV emergency detected on camera ${result.camera.cameraId}. Incident #${result.numericIncidentId} created automatically.`,
      data: result
    });
  } catch (err) {
    console.error('[CCTV Auto-Detection Error]:', err);
    return res.status(500).json({ success: false, message: err.message || 'Auto detection failed.' });
  }
};

// POST /api/cameras/auto-detect-simulation (Pick random online camera and trigger detection)
const simulateFleetDetection = async (req, res) => {
  try {
    const [onlineCameras] = await db.query("SELECT id, camera_id FROM cameras WHERE status = 'ONLINE' ORDER BY RAND() LIMIT 1");
    if (onlineCameras.length === 0) {
      return res.status(400).json({ success: false, message: 'No online cameras available for detection simulation.' });
    }

    const camera = onlineCameras[0];
    const io = req.app.get('io');
    const { detectEmergencyOnCamera } = require('../services/cctvDetectionService');
    const result = await detectEmergencyOnCamera(camera.id, req.body || {}, io);

    return res.status(201).json({
      success: true,
      message: `Simulated vision detection executed on ${camera.camera_id}.`,
      data: result
    });
  } catch (err) {
    console.error('[Simulate Fleet Detection Error]:', err);
    return res.status(500).json({ success: false, message: err.message || 'Simulation failed.' });
  }
};

// GET /api/cameras/surveillance-daemon/status
const getSurveillanceDaemonStatus = async (req, res) => {
  try {
    const { getSurveillanceStatus } = require('../services/cctvDetectionService');
    const status = getSurveillanceStatus();
    return res.json({
      success: true,
      data: status
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/cameras/surveillance-daemon/toggle
const toggleSurveillanceDaemon = async (req, res) => {
  try {
    const io = req.app.get('io');
    const {
      getSurveillanceStatus,
      startAutonomousSurveillanceWorker,
      stopAutonomousSurveillanceWorker
    } = require('../services/cctvDetectionService');

    const current = getSurveillanceStatus();
    if (current.active) {
      stopAutonomousSurveillanceWorker();
    } else {
      startAutonomousSurveillanceWorker(io, { startDelayMs: 1000 });
    }

    return res.json({
      success: true,
      message: `Surveillance worker is now ${!current.active ? 'ACTIVE' : 'STOPPED'}.`,
      data: getSurveillanceStatus()
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/cameras/surveillance-daemon/tick
const triggerSurveillanceTick = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { triggerAutonomousSurveillanceTick } = require('../services/cctvDetectionService');
    const result = await triggerAutonomousSurveillanceTick(io);

    return res.status(201).json({
      success: true,
      message: `Autonomous surveillance scan executed. Incident #${result.numericIncidentId} created and alerted.`,
      data: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllCameras,
  getCameraStats,
  getCameraById,
  createCamera,
  updateCamera,
  deleteCamera,
  triggerManualSnapshot,
  triggerCctvAutoDetection,
  simulateFleetDetection,
  getSurveillanceDaemonStatus,
  toggleSurveillanceDaemon,
  triggerSurveillanceTick
};
