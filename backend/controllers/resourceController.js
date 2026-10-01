const db = require('../config/db');

// GET /api/resources
const getAllResources = async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = 'SELECT * FROM resources WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY type ASC, name ASC';

    const [resources] = await db.query(query, params);
    return res.json({ success: true, count: resources.length, data: resources });
  } catch (err) {
    console.error('[Get All Resources Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch resources.' });
  }
};

// POST /api/resources (Admin)
const createResource = async (req, res) => {
  try {
    const { name, type, quantity, location, status } = req.body;

    if (!name || !type || !location) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and location are required.'
      });
    }

    const validTypes = ['Ambulance', 'Fire Truck', 'Rescue Team', 'Medical Kit', 'Boat'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Allowed types: ${validTypes.join(', ')}`
      });
    }

    const qty = parseInt(quantity, 10) || 1;
    const initialStatus = status || 'Available';

    const [result] = await db.query(
      `INSERT INTO resources (name, type, quantity, available, location, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), type, qty, qty, location.trim(), initialStatus]
    );

    const [newResource] = await db.query('SELECT * FROM resources WHERE id = ?', [result.insertId]);

    const io = req.app.get('io');
    if (io) {
      io.emit('resourceUpdated', newResource[0]);
    }

    return res.status(201).json({
      success: true,
      message: 'Resource added successfully.',
      data: newResource[0]
    });
  } catch (err) {
    console.error('[Create Resource Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to create resource.' });
  }
};

// PUT /api/resources/:id (Admin)
const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, quantity, available, location, status } = req.body;

    const [exists] = await db.query('SELECT * FROM resources WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    const current = exists[0];
    const newName = name !== undefined ? name.trim() : current.name;
    const newType = type !== undefined ? type : current.type;
    const newQty = quantity !== undefined ? parseInt(quantity, 10) : current.quantity;
    const newAvail = available !== undefined ? Math.min(parseInt(available, 10), newQty) : current.available;
    const newLoc = location !== undefined ? location.trim() : current.location;
    let newStatus = status !== undefined ? status : current.status;

    if (newAvail === 0 && newStatus === 'Available') {
      newStatus = 'Busy';
    } else if (newAvail > 0 && newStatus === 'Busy') {
      newStatus = 'Available';
    }

    await db.query(
      `UPDATE resources 
       SET name = ?, type = ?, quantity = ?, available = ?, location = ?, status = ?
       WHERE id = ?`,
      [newName, newType, newQty, newAvail, newLoc, newStatus, id]
    );

    const [updated] = await db.query('SELECT * FROM resources WHERE id = ?', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('resourceUpdated', updated[0]);
    }

    return res.json({
      success: true,
      message: 'Resource updated successfully.',
      data: updated[0]
    });
  } catch (err) {
    console.error('[Update Resource Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to update resource.' });
  }
};

// DELETE /api/resources/:id (Admin)
const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const [exists] = await db.query('SELECT id FROM resources WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    await db.query('DELETE FROM resources WHERE id = ?', [id]);

    return res.json({ success: true, message: 'Resource deleted successfully.' });
  } catch (err) {
    console.error('[Delete Resource Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete resource.' });
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

// POST /api/incidents/:id/resources (Admin resource assignment)
const assignResourceToIncident = async (req, res) => {
  try {
    const { id: incidentId } = req.params;
    const numId = Number(incidentId);
    const resourceId = req.body.resource_id || req.body.resourceId;
    const assignQty = parseInt(req.body.quantity, 10) || 1;

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required.'
      });
    }

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

    // Verify incident exists
    const [incidents] = await db.query('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    if (incidents.length === 0) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    // Verify resource exists and check availability
    const [resources] = await db.query('SELECT * FROM resources WHERE id = ?', [resourceId]);
    if (resources.length === 0) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    const resource = resources[0];
    if (resource.available < assignQty) {
      return res.status(400).json({
        success: false,
        message: `Resource assignment failed. Only ${resource.available} units of "${resource.name}" currently available.`
      });
    }

    // Decrement available count
    const remainingAvail = resource.available - assignQty;
    const newStatus = remainingAvail === 0 ? 'Busy' : resource.status;

    await db.query(
      'UPDATE resources SET available = ?, status = ? WHERE id = ?',
      [remainingAvail, newStatus, resourceId]
    );

    // Record assignment in incident_resources
    await db.query(
      'INSERT INTO incident_resources (incident_id, resource_id, quantity) VALUES (?, ?, ?)',
      [incidentId, resourceId, assignQty]
    );

    // If incident status was "Reported", advance to "Assigned"
    let currentIncident = incidents[0];
    if (currentIncident.status === 'Reported') {
      await db.query('UPDATE incidents SET status = "Assigned" WHERE id = ?', [incidentId]);
      currentIncident.status = 'Assigned';
    }

    // Broadcast update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('incidentUpdated', {
        id: Number(incidentId),
        status: currentIncident.status
      });
      io.emit('resourceUpdated', {
        id: Number(resourceId),
        available: remainingAvail,
        status: newStatus
      });
    }

    return res.json({
      success: true,
      message: `Successfully assigned ${assignQty}x "${resource.name}" to incident #${incidentId}.`,
      data: {
        incidentId: Number(incidentId),
        status: currentIncident.status,
        assignedResource: {
          resourceId: Number(resourceId),
          name: resource.name,
          type: resource.type,
          quantity: assignQty,
          remainingAvailable: remainingAvail
        }
      }
    });
  } catch (err) {
    console.error('[Assign Resource Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Resource assignment failed. Please check parameters and try again.'
    });
  }
};

module.exports = {
  getAllResources,
  createResource,
  updateResource,
  deleteResource,
  assignResourceToIncident
};
