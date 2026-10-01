const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const resourceController = require('../controllers/resourceController');
const { verifyToken, optionalAuth, requireAdmin } = require('../middleware/auth');

// Public or Citizen/Admin endpoints
router.get('/', incidentController.getAllIncidents);
router.get('/:id', incidentController.getIncidentById);
router.post('/', optionalAuth, incidentController.createIncident);

// Protected Admin endpoints
router.put('/:id/status', verifyToken, requireAdmin, incidentController.updateIncidentStatus);
router.delete('/:id', verifyToken, requireAdmin, incidentController.deleteIncident);

// Resource assignment to incident
router.post('/:id/resources', verifyToken, requireAdmin, resourceController.assignResourceToIncident);
router.post('/:id/auto-dispatch-resources', verifyToken, requireAdmin, incidentController.autoDispatchResources);

module.exports = router;
