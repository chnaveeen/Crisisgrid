const { analyzeIncident, analyzeCctvEmergency } = require('../services/aiService');

// POST /api/ai/analyze
const analyze = async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description text is required for AI analysis.'
      });
    }

    const analysis = await analyzeIncident(description.trim());
    return res.json({
      success: true,
      data: analysis
    });
  } catch (err) {
    console.error('[AI Controller Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'AI analysis encountered an error. Rule-based fallback will be used.'
    });
  }
};

// POST /api/ai/analyze-cctv
const analyzeCctv = async (req, res) => {
  try {
    const cctvData = req.body || {};
    const result = await analyzeCctvEmergency(cctvData);

    return res.json({
      success: true,
      message: 'CCTV emergency event analyzed by AI detection engine.',
      data: result
    });
  } catch (err) {
    console.error('[AI CCTV Analysis Error]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'CCTV AI analysis failed.'
    });
  }
};

module.exports = {
  analyze,
  analyzeCctv
};
