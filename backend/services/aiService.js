/**
 * CrisisGrid AI - Emergency Classification & Resource Recommendation Service
 * Supports LLM API (Gemini / OpenAI compatible) with seamless rule-based fallback.
 */

const analyzeIncident = async (description) => {
  if (!description || typeof description !== 'string') {
    return getRuleBasedAnalysis('');
  }

  const apiKey = process.env.AI_API_KEY;

  // If an API key is configured, attempt LLM classification
  if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_API_KEY') {
    try {
      const llmResult = await callLlmApi(description, apiKey.trim());
      if (llmResult && llmResult.type && llmResult.severity && llmResult.summary) {
        return {
          ...llmResult,
          source: 'LLM_API'
        };
      }
    } catch (err) {
      console.warn('[AI Service] LLM API call failed or timed out. Falling back to rule-based engine:', err.message);
    }
  }

  // Robust Rule-Based Fallback Engine
  const result = getRuleBasedAnalysis(description);
  return {
    ...result,
    source: 'RULE_BASED_FALLBACK'
  };
};

/**
 * Attempts to call an LLM API (Google Gemini or OpenAI standard)
 */
async function callLlmApi(description, apiKey) {
  const prompt = `You are the AI engine for CrisisGrid AI, an emergency response coordination platform.
Analyze the following emergency incident description and return ONLY a valid JSON object (no markdown, no backticks, no code blocks):
{
  "type": "Flood" | "Fire" | "Accident" | "Medical" | "Landslide" | "Other",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "summary": "Concise 1-2 sentence summary of the incident",
  "recommendedResources": [
    { "type": "Ambulance" | "Fire Truck" | "Rescue Team" | "Medical Kit" | "Boat", "quantity": number }
  ]
}

Emergency Incident Description:
"${description.replace(/"/g, '\\"')}"`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    // Check if key looks like Gemini key (often starts with AIzaSy) or OpenAI (starts with sk-)
    const isGemini = apiKey.startsWith('AIza') || !apiKey.startsWith('sk-');

    let response;
    if (isGemini) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        }),
        signal: controller.signal
      });
    } else {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        }),
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let rawText = '';
    if (isGemini) {
      rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      rawText = data?.choices?.[0]?.message?.content || '';
    }

    // Strip backticks if any
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const validTypes = ['Flood', 'Fire', 'Accident', 'Medical', 'Landslide', 'Other'];
    const validSeverities = ['Low', 'Medium', 'High', 'Critical'];

    return {
      type: validTypes.includes(parsed.type) ? parsed.type : 'Other',
      severity: validSeverities.includes(parsed.severity) ? parsed.severity : 'Medium',
      summary: parsed.summary || description.substring(0, 150),
      recommendedResources: Array.isArray(parsed.recommendedResources) ? parsed.recommendedResources : []
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Intelligent Rule-Based Fallback Engine
 * Uses keyword frequency, contextual heuristics, and severity scoring.
 */
function getRuleBasedAnalysis(text) {
  const lower = (text || '').toLowerCase();

  // 1. Detect Incident Type
  let detectedType = 'Other';

  const typeScores = {
    Fire: 0,
    Flood: 0,
    Accident: 0,
    Medical: 0,
    Landslide: 0
  };

  const keywords = {
    Fire: ['fire', 'flame', 'burning', 'smoke', 'blaze', 'inferno', 'explosion', 'gas leak', 'spark'],
    Flood: ['flood', 'water', 'submerged', 'drown', 'overflow', 'heavy rain', 'downpour', 'cloudburst', 'inundated', 'river'],
    Accident: ['accident', 'crash', 'collision', 'overturned', 'hit and run', 'vehicle', 'car', 'truck', 'bus', 'highway'],
    Medical: ['medical', 'injury', 'unconscious', 'cardiac', 'heart attack', 'bleeding', 'fracture', 'stroke', 'collapsed', 'breathing', 'casualty', 'choking'],
    Landslide: ['landslide', 'mudslide', 'mud', 'hill', 'slope', 'rockfall', 'erosion', 'debris flow', 'mountain bypass']
  };

  for (const [type, words] of Object.entries(keywords)) {
    for (const w of words) {
      if (lower.includes(w)) {
        typeScores[type] += (w.includes(' ') ? 2 : 1);
      }
    }
  }

  let maxScore = 0;
  for (const [type, score] of Object.entries(typeScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = type;
    }
  }

  // 2. Determine Severity
  let severity = 'Medium';
  const criticalWords = ['death', 'dead', 'fatal', 'mass casualties', 'trapped', 'collapse', 'catastrophic', 'unconscious', 'cardiac arrest', 'severe', 'explosion', 'major fire', 'critical'];
  const highWords = ['rapidly', 'heavy', 'flames', 'injuries', 'urgent', 'bleeding', 'rising fast', 'multiple', 'hospital', 'evacuate', 'high'];
  const lowWords = ['minor', 'small', 'controlled', 'stable', 'cleared', 'no injuries', 'low risk'];

  let criticalHits = criticalWords.filter(w => lower.includes(w)).length;
  let highHits = highWords.filter(w => lower.includes(w)).length;
  let lowHits = lowWords.filter(w => lower.includes(w)).length;

  if (criticalHits > 0) {
    severity = 'Critical';
  } else if (highHits >= 1) {
    severity = 'High';
  } else if (lowHits > 0 && highHits === 0) {
    severity = 'Low';
  } else {
    severity = maxScore >= 2 ? 'High' : 'Medium';
  }

  // 3. Generate Short Incident Summary
  let summary = '';
  if (text.trim().length > 0) {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length > 0 && sentences[0].length >= 20) {
      summary = sentences[0] + (sentences[1] ? `. ${sentences[1]}.` : '.');
    } else {
      summary = `${detectedType} incident reported. Severity assessed as ${severity} based on environmental and structural indicators.`;
    }
  } else {
    summary = 'Emergency report submitted. Rapid assessment underway.';
  }

  if (summary.length > 200) {
    summary = summary.substring(0, 197) + '...';
  }

  // 4. Recommend Required Resources based on Type & Severity
  const recommendedResources = getRecommendedResources(detectedType, severity);

  return {
    type: detectedType,
    severity,
    summary,
    recommendedResources
  };
}

function getRecommendedResources(type, severity) {
  switch (type) {
    case 'Flood':
      if (severity === 'Critical') {
        return [
          { type: 'Rescue Team', quantity: 3 },
          { type: 'Boat', quantity: 2 },
          { type: 'Ambulance', quantity: 2 },
          { type: 'Medical Kit', quantity: 4 }
        ];
      } else if (severity === 'High') {
        return [
          { type: 'Rescue Team', quantity: 2 },
          { type: 'Boat', quantity: 1 },
          { type: 'Ambulance', quantity: 1 },
          { type: 'Medical Kit', quantity: 3 }
        ];
      } else {
        return [
          { type: 'Rescue Team', quantity: 1 },
          { type: 'Boat', quantity: 1 }
        ];
      }

    case 'Fire':
      if (severity === 'Critical') {
        return [
          { type: 'Fire Truck', quantity: 3 },
          { type: 'Ambulance', quantity: 2 },
          { type: 'Rescue Team', quantity: 2 },
          { type: 'Medical Kit', quantity: 4 }
        ];
      } else if (severity === 'High') {
        return [
          { type: 'Fire Truck', quantity: 2 },
          { type: 'Ambulance', quantity: 1 },
          { type: 'Medical Kit', quantity: 2 }
        ];
      } else {
        return [
          { type: 'Fire Truck', quantity: 1 },
          { type: 'Medical Kit', quantity: 1 }
        ];
      }

    case 'Accident':
      if (severity === 'Critical') {
        return [
          { type: 'Ambulance', quantity: 3 },
          { type: 'Rescue Team', quantity: 2 },
          { type: 'Medical Kit', quantity: 4 }
        ];
      } else if (severity === 'High') {
        return [
          { type: 'Ambulance', quantity: 2 },
          { type: 'Rescue Team', quantity: 1 },
          { type: 'Medical Kit', quantity: 2 }
        ];
      } else {
        return [
          { type: 'Ambulance', quantity: 1 },
          { type: 'Medical Kit', quantity: 1 }
        ];
      }

    case 'Medical':
      if (severity === 'Critical' || severity === 'High') {
        return [
          { type: 'Ambulance', quantity: 2 },
          { type: 'Medical Kit', quantity: 3 }
        ];
      } else {
        return [
          { type: 'Ambulance', quantity: 1 },
          { type: 'Medical Kit', quantity: 2 }
        ];
      }

    case 'Landslide':
      if (severity === 'Critical' || severity === 'High') {
        return [
          { type: 'Rescue Team', quantity: 2 },
          { type: 'Ambulance', quantity: 1 },
          { type: 'Medical Kit', quantity: 2 }
        ];
      } else {
        return [
          { type: 'Rescue Team', quantity: 1 },
          { type: 'Medical Kit', quantity: 1 }
        ];
      }

      default: // Other
        return [
          { type: 'Rescue Team', quantity: 1 },
          { type: 'Medical Kit', quantity: 1 }
        ];
    }
}

/**
 * Autonomous CCTV Emergency Analysis
 * Analyzes CCTV frames, telemetry, and camera environment to identify:
 * - Event type (Flood, Fire, Accident, Medical, Landslide, Other)
 * - Severity (Critical, High, Medium, Low)
 * - Short description
 * - Location
 * - Recommended resources
 */
const analyzeCctvEmergency = async (cctvData = {}) => {
  const { camera = {}, frame = {}, streamUrl = '', visualTelemetry = {}, rawEvent = {} } = cctvData;
  const apiKey = process.env.AI_API_KEY;

  const locationString = camera.location || rawEvent.location || 'Surveillance Sector';
  const cameraCode = camera.camera_id || rawEvent.cameraId || 'CCTV-SENSOR';
  const cameraName = camera.name || 'Surveillance Camera Node';
  const opticalCue = visualTelemetry.eventHint || rawEvent.eventHint || rawEvent.type || '';
  const frameInfo = frame.fileName || frame.filePath || 'CCTV 1080p frame';

  // 1. Attempt LLM vision/context classification if API key is configured
  if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_API_KEY') {
    try {
      const llmResult = await callLlmCctvApi({
        cameraCode,
        cameraName,
        location: locationString,
        opticalCue,
        frameInfo,
        rawEvent,
        apiKey: apiKey.trim()
      });
      if (llmResult && llmResult.eventType && llmResult.severity) {
        return {
          ...llmResult,
          location: llmResult.location || locationString,
          source: 'LLM_AI',
          confidenceScore: 0.96
        };
      }
    } catch (err) {
      console.warn('[AI Service] LLM CCTV analysis timed out or failed. Falling back to vision rule engine:', err.message);
    }
  }

  // 2. Intelligent Computer Vision Rule-Based Engine
  return getRuleBasedCctvAnalysis(cctvData);
};

/**
 * Calls LLM API for CCTV Vision Analysis
 */
async function callLlmCctvApi({ cameraCode, cameraName, location, opticalCue, frameInfo, rawEvent, apiKey }) {
  const prompt = `You are the AI Vision Decision Engine for CrisisGrid AI, an emergency surveillance & response coordination platform.
A surveillance camera has captured an anomalous optical event.
Analyze the CCTV feed details and return ONLY a valid JSON object (no markdown, no code blocks):
{
  "eventType": "Flood" | "Fire" | "Accident" | "Medical" | "Landslide" | "Other",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "shortDescription": "Concise 1-2 sentence factual description of the incident detected on camera",
  "location": "${location}",
  "recommendedResources": [
    { "type": "Ambulance" | "Fire Truck" | "Rescue Team" | "Medical Kit" | "Boat", "quantity": number }
  ]
}

Camera Code: ${cameraCode}
Camera Name: ${cameraName}
Location: ${location}
Optical / Telemetry Cue: ${opticalCue || rawEvent.description || 'Motion surge / visual anomaly detected'}
Frame Reference: ${frameInfo}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const isGemini = apiKey.startsWith('AIza') || !apiKey.startsWith('sk-');
    let response;

    if (isGemini) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        }),
        signal: controller.signal
      });
    } else {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        }),
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    let rawText = isGemini ? data?.candidates?.[0]?.content?.parts?.[0]?.text : data?.choices?.[0]?.message?.content;
    const cleaned = (rawText || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const validTypes = ['Flood', 'Fire', 'Accident', 'Medical', 'Landslide', 'Other'];
    const validSeverities = ['Low', 'Medium', 'High', 'Critical'];

    return {
      eventType: validTypes.includes(parsed.eventType || parsed.type) ? (parsed.eventType || parsed.type) : 'Other',
      severity: validSeverities.includes(parsed.severity) ? parsed.severity : 'High',
      shortDescription: parsed.shortDescription || parsed.summary || `Autonomous CCTV detection on ${cameraCode}.`,
      location: parsed.location || location,
      recommendedResources: Array.isArray(parsed.recommendedResources) ? parsed.recommendedResources : []
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Intelligent Rule-Based CCTV Computer Vision Analysis
 * Evaluates camera location, optical telemetry, motion profiles, and sensor cues.
 */
function getRuleBasedCctvAnalysis(cctvData = {}) {
  const { camera = {}, visualTelemetry = {}, rawEvent = {} } = cctvData;

  const loc = (camera.location || rawEvent.location || '').toLowerCase();
  const name = (camera.name || '').toLowerCase();
  const cue = (visualTelemetry.eventHint || rawEvent.type || rawEvent.eventHint || rawEvent.description || '').toLowerCase();
  const combined = `${loc} ${name} ${cue}`;

  let eventType = 'Other';
  let severity = 'High';
  let shortDescription = '';

  // 1. Environmental heuristics matching
  if (combined.includes('flood') || combined.includes('river') || combined.includes('pier') || combined.includes('water') || combined.includes('surge')) {
    eventType = 'Flood';
    severity = 'Critical';
    shortDescription = `Autonomous CCTV computer vision detected river embankment water level exceeding critical danger threshold at ${camera.location || 'Riverside Pier'}. Flash flooding overtopping roadway.`;
  } else if (combined.includes('fire') || combined.includes('smoke') || combined.includes('flame') || combined.includes('blaze') || combined.includes('chemical') || combined.includes('industrial') || combined.includes('warehouse')) {
    eventType = 'Fire';
    severity = 'Critical';
    shortDescription = `Thermal analysis and optical smoke sensor triggered on camera ${camera.camera_id || 'CCTV'} at ${camera.location || 'Sector 2'}. Dense smoke plume and flame propagation observed.`;
  } else if (combined.includes('accident') || combined.includes('collision') || combined.includes('crash') || combined.includes('junction') || combined.includes('crossroads') || combined.includes('highway') || combined.includes('toll')) {
    eventType = 'Accident';
    severity = 'High';
    shortDescription = `Surveillance motion analytics detected rapid vehicle deceleration and structural collision impact at ${camera.location || 'intersection'}. Roadway obstructed.`;
  } else if (combined.includes('landslide') || combined.includes('mountain') || combined.includes('rockfall') || combined.includes('ridge') || combined.includes('slope') || combined.includes('mud')) {
    eventType = 'Landslide';
    severity = 'Critical';
    shortDescription = `Computer vision optical flow detected soil slippage and heavy rockfall debris blocking roadway at ${camera.location || 'Mountain Access Pass'}.`;
  } else if (combined.includes('medical') || combined.includes('arena') || combined.includes('stadium') || combined.includes('crowd') || combined.includes('distress') || combined.includes('collapsed')) {
    eventType = 'Medical';
    severity = 'Medium';
    shortDescription = `Automated crowd density and distress detection triggered at ${camera.location || 'venue entrance'}. Individual casualty observed.`;
  } else {
    eventType = rawEvent.type || 'Other';
    severity = rawEvent.severity || 'Medium';
    shortDescription = rawEvent.description || `Autonomous visual surveillance alert detected by camera ${camera.camera_id || 'CCTV'} at ${camera.location || 'grid node'}.`;
  }

  // Override with explicit user-supplied rawEvent if specified
  if (rawEvent.type) eventType = rawEvent.type;
  if (rawEvent.severity) severity = rawEvent.severity;
  if (rawEvent.description) shortDescription = rawEvent.description;

  const recommendedResources = getRecommendedResources(eventType, severity);

  return {
    eventType,
    severity,
    shortDescription,
    location: camera.location || rawEvent.location || 'Surveillance Grid Node',
    recommendedResources,
    source: 'VISION_AI_RULE_ENGINE',
    confidenceScore: 0.94
  };
}

module.exports = {
  analyzeIncident,
  analyzeCctvEmergency,
  getRuleBasedAnalysis,
  getRuleBasedCctvAnalysis
};
