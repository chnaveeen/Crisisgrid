const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/analyze', aiController.analyze);
router.post('/analyze-cctv', aiController.analyzeCctv);

module.exports = router;
