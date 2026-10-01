const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All CCTV routes require authentication and admin privileges
router.use(verifyToken, requireAdmin);

router.get('/', cameraController.getAllCameras);
router.get('/stats', cameraController.getCameraStats);
router.get('/:id', cameraController.getCameraById);
router.post('/', cameraController.createCamera);
router.put('/:id', cameraController.updateCamera);
router.delete('/:id', cameraController.deleteCamera);
router.post('/:id/snapshot', cameraController.triggerManualSnapshot);
router.post('/:id/detect-incident', cameraController.triggerCctvAutoDetection);
router.post('/auto-detect-simulation', cameraController.simulateFleetDetection);
router.get('/surveillance-daemon/status', cameraController.getSurveillanceDaemonStatus);
router.post('/surveillance-daemon/toggle', cameraController.toggleSurveillanceDaemon);
router.post('/surveillance-daemon/tick', cameraController.triggerSurveillanceTick);

module.exports = router;
