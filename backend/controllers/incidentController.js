const db = require('../config/db');
const { analyzeIncident } = require('../services/aiService');
const { processIncidentCCTV, findNearbyCameras } = require('../services/cameraService');

// GET /api/incidents
const getAllIncidents = async (req, res) => {
  try {
    const { status, type, severity, created_by } = req.query;

    let query = `
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
        cam.camera_id as detection_camera_code,
        cam.name as detection_camera_name,
        i.created_by,
        i.created_at,
        COALESCE(u.name, CASE WHEN i.detection_source = 'CCTV_AUTO_DETECTION' THEN CONCAT('CCTV Vision (', COALESCE(cam.camera_id, 'Feed'), ')') ELSE 'System Sensor' END) as reporter_name,
        u.email as reporter_email,
        COUNT(ir.id) as assigned_resource_count
      FROM incidents i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN cameras cam ON i.detection_camera_id = cam.id
      LEFT JOIN incident_resources ir ON i.id = ir.incident_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }
    if (type) {
      query += ` AND i.type = ?`;
      params.push(type);
    }
    if (severity) {
      query += ` AND i.severity = ?`;
      params.push(severity);
    }
    if (created_by) {
      query += ` AND i.created_by = ?`;
      params.push(created_by);
    }

    query += ` GROUP BY i.id ORDER BY i.created_at DESC`;

    const [incidents] = await db.query(query, params);
    return res.json({ success: true, count: incidents.length, data: incidents });
  } catch (err) {
    console.error('[Get All Incidents Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch incidents.' });
  }
};

const INBOUND_INCIDENTS = {
  90001: {
    id: 90001,
    title: 'High-Impact Vehicle Collision on MG Road Expressway',
    description: 'High-speed collision involving three vehicles detected by AI optical vision. Severe lane obstruction and vehicle deformation identified.',
    type: 'Accident',
    severity: 'Critical',
    location: 'MG Road Expressway — Mile Marker 14',
    latitude: 12.9716,
    longitude: 77.5946,
    status: 'Reported',
    detection_source: 'CCTV_AUTO_DETECTION',
    ai_summary: 'High-speed multi-car pileup detected with severe lane blockage, vehicle deformation, and hazard flashers active.'
  },
  90002: {
    id: 90002,
    title: 'Industrial Warehouse Chemical Fire & Toxic Plume',
    description: 'Rapidly propagating chemical fire detected with heavy dark toxic smoke plumes. Thermal sensors confirm critical heat elevation.',
    type: 'Fire',
    severity: 'Critical',
    location: 'Peenya Industrial Zone — Sector 4',
    latitude: 12.9620,
    longitude: 77.6100,
    status: 'Reported',
    detection_source: 'CCTV_AUTO_DETECTION',
    ai_summary: 'Dense dark smoke plumes and rapid flame spreading detected in chemical storage bay. Elevated thermal threshold breached.'
  },
  90003: {
    id: 90003,
    title: 'Flash Flooding & Road Submersion at South Ring Subway',
    description: 'Rapid water level accumulation exceeding 2.5 feet at underpass entrance; vehicles stalling and route completely impassable.',
    type: 'Flood',
    severity: 'High',
    location: 'South Ring Road — Underpass Metro Approach',
    latitude: 12.9510,
    longitude: 77.5820,
    status: 'Reported',
    detection_source: 'CCTV_AUTO_DETECTION',
    ai_summary: 'Water level exceeded 2.5 feet at underpass approach; vehicle stalling and road impassability detected by flood surveillance gauge.'
  }
};

async function ensureInboundIncidentPersisted(numId) {
  if (INBOUND_INCIDENTS[numId]) {
    const proto = INBOUND_INCIDENTS[numId];
    await db.query(`
      INSERT IGNORE INTO incidents (id, title, description, type, severity, location, latitude, longitude, status, ai_summary, detection_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      proto.id,
      proto.title,
      proto.description,
      proto.type,
      proto.severity,
      proto.location,
      proto.latitude,
      proto.longitude,
      proto.status,
      proto.ai_summary,
      proto.detection_source
    ]);
  }
}

// GET /api/incidents/:id
const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    await ensureInboundIncidentPersisted(numId);

    const [incidents] = await db.query(`
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
        cam.camera_id as detection_camera_code,
        cam.name as detection_camera_name,
        i.created_by,
        i.created_at,
        COALESCE(u.name, CASE WHEN i.detection_source = 'CCTV_AUTO_DETECTION' THEN CONCAT('CCTV Vision (', COALESCE(cam.camera_id, 'Feed'), ')') ELSE 'System Sensor' END) as reporter_name,
        u.email as reporter_email
      FROM incidents i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN cameras cam ON i.detection_camera_id = cam.id
      WHERE i.id = ?
    `, [id]);

    if (incidents.length === 0) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    const incident = incidents[0];

    // Fetch assigned resources
    const [assignedResources] = await db.query(`
      SELECT 
        ir.id as assignment_id,
        ir.quantity as assigned_quantity,
        ir.assigned_at,
        r.id as resource_id,
        r.name,
        r.type,
        r.location,
        r.available,
        r.status
      FROM incident_resources ir
      JOIN resources r ON ir.resource_id = r.id
      WHERE ir.incident_id = ?
    `, [id]);

    incident.assignedResources = assignedResources;

    // Fetch nearby CCTV cameras associated with this incident
    const [nearbyCameras] = await db.query(`
      SELECT 
        ic.id as incident_camera_id,
        ic.distance_km,
        ic.capture_status,
        ic.captured_at,
        c.id as camera_db_id,
        c.camera_id,
        c.name as camera_name,
        c.type as camera_type,
        c.location as camera_location,
        c.status as camera_status,
        c.stream_url,
        c.snapshot_url
      FROM incident_camera ic
      JOIN cameras c ON ic.camera_id = c.id
      WHERE ic.incident_id = ?
      ORDER BY ic.distance_km ASC
    `, [id]);

    let resolvedCameras = nearbyCameras;
    if (resolvedCameras.length === 0 && incident.latitude && incident.longitude) {
      // Dynamic fallback for incidents before migration: look up nearby cameras within 1.5 KM
      const liveNearby = await findNearbyCameras(incident.latitude, incident.longitude, 1.5);
      resolvedCameras = liveNearby.map(c => ({
        incident_camera_id: null,
        distance_km: c.distance_km,
        capture_status: c.status === 'ONLINE' ? 'PENDING' : 'SKIPPED_OFFLINE',
        captured_at: null,
        camera_db_id: c.id,
        camera_id: c.camera_id,
        camera_name: c.name,
        camera_type: c.type,
        camera_location: c.location,
        camera_status: c.status,
        stream_url: c.stream_url,
        snapshot_url: c.snapshot_url
      }));
    }
    incident.nearbyCameras = resolvedCameras;

    // Fetch CCTV evidence captured for this incident
    const [cctvEvidence] = await db.query(`
      SELECT 
        ce.id as evidence_id,
        ce.file_path,
        ce.file_type,
        ce.captured_at,
        ce.capture_start_time,
        ce.capture_end_time,
        ce.stream_reference,
        ce.evidence_type,
        ce.status,
        c.id as camera_db_id,
        c.camera_id,
        c.name as camera_name,
        c.type as camera_type,
        c.location as camera_location,
        c.stream_url,
        c.snapshot_url,
        ic.distance_km
      FROM cctv_evidence ce
      JOIN cameras c ON ce.camera_id = c.id
      LEFT JOIN incident_camera ic ON (ic.incident_id = ce.incident_id AND ic.camera_id = ce.camera_id)
      WHERE ce.incident_id = ?
      ORDER BY ce.captured_at DESC
    `, [id]);
    incident.cctvEvidence = cctvEvidence;

    // AI recommendation breakdown based on current description
    const aiAnalysis = await analyzeIncident(incident.description);
    incident.recommendedResources = aiAnalysis.recommendedResources;
    incident.aiSource = aiAnalysis.source;

    return res.json({ success: true, data: incident });
  } catch (err) {
    console.error('[Get Incident By ID Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch incident details.' });
  }
};

// POST /api/incidents
const createIncident = async (req, res) => {
  try {
    let { title, description, type, severity, location, latitude, longitude } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: 'Incident title, description, and location are required.'
      });
    }

    // Default coordinates if missing (Metro center)
    const lat = latitude ? parseFloat(latitude) : 12.9716;
    const lng = longitude ? parseFloat(longitude) : 77.5946;

    // Perform AI analysis on the emergency description
    const aiResult = await analyzeIncident(description);

    const finalType = type && type !== 'Auto-Detect' ? type : aiResult.type;
    const finalSeverity = severity && severity !== 'Auto-Detect' ? severity : aiResult.severity;
    const aiSummary = aiResult.summary;
    const createdBy = req.user ? req.user.id : (req.body.created_by || null);

    const [result] = await db.query(
      `INSERT INTO incidents (title, description, type, severity, location, latitude, longitude, status, ai_summary, detection_source, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Reported', ?, 'Citizen', ?)`,
      [title.trim(), description.trim(), finalType, finalSeverity, location.trim(), lat, lng, aiSummary, createdBy]
    );

    const newId = result.insertId;

    const [newIncidents] = await db.query(`
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
        i.created_by,
        i.created_at,
        COALESCE(u.name, 'Citizen Report') as reporter_name
      FROM incidents i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = ?
    `, [newId]);

    const createdIncident = newIncidents[0];
    const formattedIncId = `INC-2026-${String(newId).padStart(5, '0')}`;
    createdIncident.incident_id = formattedIncId;
    createdIncident.assigned_resource_count = 0;
    createdIncident.recommendedResources = aiResult.recommendedResources;
    createdIncident.aiSource = aiResult.source;

    const io = req.app.get('io');

    // Automated CCTV Proximity Detection and Evidence Capture
    let primaryEvidence = null;
    try {
      const cctvResults = await processIncidentCCTV(newId, lat, lng, io, {
        title: createdIncident.title,
        type: createdIncident.type,
        severity: createdIncident.severity
      });
      createdIncident.cctv = cctvResults;
      if (cctvResults && Array.isArray(cctvResults.evidenceList) && cctvResults.evidenceList.length > 0) {
        primaryEvidence = cctvResults.evidenceList[0];
      }
    } catch (cctvErr) {
      console.error(`[CCTV Service Error on Incident #${newId}]:`, cctvErr.message);
    }

    // Unified Automatic Emergency Alert Dispatch
    const unifiedAlert = {
      alertType: 'EMERGENCY_ALERT',
      alertId: `ALT-${Date.now()}`,
      incidentId: formattedIncId,
      numericIncidentId: newId,
      source: 'Citizen',
      sourceLabel: 'Citizen Report',
      reporterName: createdIncident.reporter_name || 'Citizen Report',
      type: createdIncident.type,
      severity: createdIncident.severity,
      title: createdIncident.title,
      description: createdIncident.description,
      location: createdIncident.location,
      latitude: createdIncident.latitude,
      longitude: createdIncident.longitude,
      time: new Date(createdIncident.created_at).toISOString().replace('T', ' ').substring(0, 19),
      aiSummary: createdIncident.ai_summary,
      recommendedResources: createdIncident.recommendedResources,
      cctvEvidence: primaryEvidence ? {
        hasEvidence: true,
        cameraId: primaryEvidence.cameraId,
        cameraName: primaryEvidence.cameraName,
        filePath: primaryEvidence.filePath,
        captureTime: primaryEvidence.capturedAt,
        captureStartTime: primaryEvidence.captureStartTime,
        captureEndTime: primaryEvidence.captureEndTime,
        streamReference: primaryEvidence.streamReference,
        distance_km: primaryEvidence.distance_km
      } : {
        hasEvidence: false
      },
      incident: createdIncident
    };

    if (io) {
      // 1. Primary real-time event required: incident:new
      io.emit('incident:new', createdIncident);
      // 2. Standardized unified emergency alert to Control Room
      io.emit('emergency:alert', unifiedAlert);
      // 3. Backward compatible events
      io.emit('newIncident', createdIncident);
      io.emit('incident:created', {
        incidentId: formattedIncId,
        numericIncidentId: newId,
        incident: createdIncident
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Emergency incident reported, analyzed by AI, and alerted to Control Room successfully.',
      data: createdIncident,
      alert: unifiedAlert
    });
  } catch (err) {
    console.error('[Create Incident Error]:', err);
    return res.status(500).json({ success: false, message: 'Unable to submit incident. Please try again.' });
  }
};

// PUT /api/incidents/:id/status
const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const [exists] = await db.query('SELECT id FROM incidents WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    await db.query('UPDATE incidents SET status = ? WHERE id = ?', [status, id]);

    // Fetch updated incident
    const [updated] = await db.query(`
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
        i.created_by,
        i.created_at
      FROM incidents i
      WHERE i.id = ?
    `, [id]);

    const incidentData = updated[0];

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('incidentUpdated', incidentData);
    }

    return res.json({
      success: true,
      message: `Incident status updated to "${status}".`,
      data: incidentData
    });
  } catch (err) {
    console.error('[Update Incident Status Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to update incident status.' });
  }
};

// DELETE /api/incidents/:id
const deleteIncident = async (req, res) => {
  try {
    const { id } = req.params;

    const [exists] = await db.query('SELECT id FROM incidents WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    await db.query('DELETE FROM incidents WHERE id = ?', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('incidentDeleted', { id: Number(id) });
    }

    return res.json({ success: true, message: 'Incident removed successfully.' });
  } catch (err) {
    console.error('[Delete Incident Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete incident.' });
  }
};

// POST /api/incidents/:id/auto-dispatch-resources
const autoDispatchResources = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    await ensureInboundIncidentPersisted(numId);

    const [incidents] = await db.query('SELECT * FROM incidents WHERE id = ?', [id]);
    if (incidents.length === 0) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    const incident = incidents[0];

    // Generate AI recommendations according to incident
    const aiAnalysis = await analyzeIncident(incident.description);
    const recommendations = aiAnalysis.recommendedResources || [];

    const dispatchedList = [];

    // For each recommended resource type, find available resources and allocate
    for (const rec of recommendations) {
      const requiredQty = rec.quantity || 1;
      const [availableResources] = await db.query(
        'SELECT * FROM resources WHERE type = ? AND available > 0 ORDER BY available DESC',
        [rec.type]
      );

      let needed = requiredQty;
      for (const resItem of availableResources) {
        if (needed <= 0) break;
        const allocateQty = Math.min(resItem.available, needed);
        if (allocateQty > 0) {
          const [insertRes] = await db.query(
            'INSERT INTO incident_resources (incident_id, resource_id, quantity) VALUES (?, ?, ?)',
            [incident.id, resItem.id, allocateQty]
          );

          const newAvail = resItem.available - allocateQty;
          const newStatus = newAvail === 0 ? 'Busy' : resItem.status;
          await db.query(
            'UPDATE resources SET available = ?, status = ? WHERE id = ?',
            [newAvail, newStatus, resItem.id]
          );

          dispatchedList.push({
            assignment_id: insertRes.insertId,
            resource_id: resItem.id,
            name: resItem.name,
            type: resItem.type,
            quantity: allocateQty,
            location: resItem.location
          });

          needed -= allocateQty;
        }
      }
    }

    // Update incident status to In Progress
    await db.query('UPDATE incidents SET status = ? WHERE id = ?', ['In Progress', incident.id]);
    incident.status = 'In Progress';

    // Broadcast Socket.IO update
    const io = req.app.get('io');
    if (io) {
      io.emit('incidentUpdated', {
        id: incident.id,
        status: 'In Progress',
        assigned_resource_count: dispatchedList.length
      });
      io.emit('resourceUpdated', { incidentId: incident.id, dispatchedCount: dispatchedList.length });
    }

    return res.json({
      success: true,
      message: `Successfully generated and dispatched ${dispatchedList.reduce((acc, d) => acc + d.quantity, 0)} units across ${dispatchedList.length} resource types according to incident requirements.`,
      data: {
        incidentId: incident.id,
        status: 'In Progress',
        recommendations,
        dispatched: dispatchedList,
        totalUnitsDispatched: dispatchedList.reduce((acc, d) => acc + d.quantity, 0)
      }
    });
  } catch (err) {
    console.error('[Auto Dispatch Resources Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to auto-dispatch resources.' });
  }
};

module.exports = {
  getAllIncidents,
  getIncidentById,
  createIncident,
  updateIncidentStatus,
  deleteIncident,
  autoDispatchResources
};
