const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");

function loadJson(filename) {
  const filePath = path.join(dataDir, filename);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// In-memory state initialized from JSON
let dashboardData = loadJson("dashboard.json");
let zonesData = loadJson("zones.json");
let sensorsData = loadJson("sensors.json");
let predictionsData = loadJson("predictions.json");
let alertsData = loadJson("alerts.json");
const scenariosData = loadJson("scenarios.json");

// GET /api/dashboard
router.get("/dashboard", (req, res) => {
  res.json({
    success: true,
    data: {
      ...dashboardData,
      lastUpdated: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST",
      activeAlertsCount: alertsData.filter(a => a.status === "ACTIVE").length,
      zonesSummary: zonesData.map(z => ({ name: z.name, risk: z.risk, score: z.riskScore }))
    }
  });
});

// GET /api/zones
router.get("/zones", (req, res) => {
  res.json({
    success: true,
    data: zonesData
  });
});

// GET /api/sensors
router.get("/sensors", (req, res) => {
  res.json({
    success: true,
    data: sensorsData
  });
});

// GET /api/predictions
router.get("/predictions", (req, res) => {
  res.json({
    success: true,
    data: predictionsData
  });
});

// GET /api/alerts
router.get("/alerts", (req, res) => {
  res.json({
    success: true,
    data: alertsData
  });
});

// GET /api/scenarios
router.get("/scenarios", (req, res) => {
  res.json({
    success: true,
    data: Object.keys(scenariosData).map(key => ({
      id: key,
      name: scenariosData[key].name,
      regionalRisk: scenariosData[key].regionalRisk,
      riskScore: scenariosData[key].riskScore
    }))
  });
});

// POST /api/simulate - Change scenario or escalate event
router.post("/simulate", (req, res) => {
  const { scenarioId, escalate } = req.body;

  if (scenarioId && scenariosData[scenarioId]) {
    const scenario = scenariosData[scenarioId];
    dashboardData.regionalRisk = scenario.regionalRisk;
    predictionsData.overallRisk = scenario.regionalRisk;
    predictionsData.riskScore = scenario.riskScore;
    predictionsData.floodProbability = scenario.floodProbability;
    predictionsData.confidence = scenario.confidence;
    predictionsData.explanation = scenario.explanation;

    // Update sensors
    if (scenario.sensors.rainfall) sensorsData.current.rainfall.value = scenario.sensors.rainfall.value;
    if (scenario.sensors.riverLevel) sensorsData.current.riverLevel.value = scenario.sensors.riverLevel.value;
    if (scenario.sensors.soilMoisture) sensorsData.current.soilMoisture.value = scenario.sensors.soilMoisture.value;

    // Update zones
    zonesData = zonesData.map(zone => {
      const updated = scenario.zones.find(z => z.id === zone.id || z.name === zone.name);
      if (updated) {
        return {
          ...zone,
          risk: updated.risk,
          riskScore: updated.riskScore,
          rainfall: updated.rainfall || zone.rainfall,
          riverLevel: updated.riverLevel || zone.riverLevel,
          soilMoisture: updated.soilMoisture || zone.soilMoisture
        };
      }
      return zone;
    });

    return res.json({
      success: true,
      message: `Scenario '${scenario.name}' applied successfully.`,
      appliedScenario: scenario.name,
      data: {
        dashboard: dashboardData,
        predictions: predictionsData,
        sensors: sensorsData,
        zones: zonesData
      }
    });
  }

  // Escalation simulation
  if (escalate) {
    dashboardData.regionalRisk = "CRITICAL";
    predictionsData.overallRisk = "CRITICAL";
    predictionsData.riskScore = 96;
    predictionsData.floodProbability = 98;
    sensorsData.current.rainfall.value = 98;
    sensorsData.current.rainfall.trend = "+32%";
    sensorsData.current.riverLevel.value = 5.3;
    sensorsData.current.riverLevel.trend = "+0.9 m";
    sensorsData.current.soilMoisture.value = 94;

    zonesData = zonesData.map(z => {
      if (z.name === "Hill View") {
        return { ...z, risk: "CRITICAL", riskScore: 96, rainfall: 98, riverLevel: 5.3, soilMoisture: 94 };
      }
      if (z.name === "Valley Road") {
        return { ...z, risk: "CRITICAL", riskScore: 89, rainfall: 92, riverLevel: 5.0, soilMoisture: 90 };
      }
      return z;
    });

    const newAlert = {
      id: `ALT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " IST",
      zone: "Hill View (Zone A)",
      riskLevel: "CRITICAL",
      category: "FLASH FLOOD EMERGENCY",
      title: "Flash Flood Surge Imminent — Immediate Evacuation",
      message: "Automated simulation escalation: rainfall 98 mm/hr, river 5.3m (>4.5m danger threshold). High ground evacuation initiated.",
      recommendedAction: "Evacuate Hill View sectors 1 to 4 via North Bypass to Highland Safe Center 1.",
      status: "ACTIVE",
      broadcastSent: true
    };

    alertsData.unshift(newAlert);

    return res.json({
      success: true,
      message: "Flood event escalation simulated successfully.",
      newAlert,
      data: {
        dashboard: dashboardData,
        predictions: predictionsData,
        sensors: sensorsData,
        zones: zonesData,
        alerts: alertsData
      }
    });
  }

  res.status(400).json({ success: false, error: "Provide scenarioId or escalate flag." });
});

// POST /api/alerts/trigger - Emergency Alert Broadcast
router.post("/alerts/trigger", (req, res) => {
  const { zoneName = "Hill View", riskLevel = "CRITICAL" } = req.body;

  const emergencyAlert = {
    id: `ALT-EMERGENCY-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " IST",
    zone: `${zoneName} (Zone A)`,
    riskLevel: riskLevel,
    category: "CIVIL DEFENSE EMERGENCY BROADCAST",
    title: `🚨 EMERGENCY WARNING: Flash Flood Imminent in ${zoneName}`,
    message: `Hyper-local predictive model indicates 91% flash flood probability within 30-60 minutes. Rapid water level rise expected along natural drainage lines.`,
    recommendedAction: "Immediate mandatory evacuation of all residents in low-lying sectors. Move to designated Highland Safe Centers immediately.",
    status: "ACTIVE",
    broadcastSent: true,
    channels: ["Cell Broadcast (CAP)", "Sirens", "NDRF Dispatch", "Traffic Signals"]
  };

  alertsData.unshift(emergencyAlert);

  res.json({
    success: true,
    message: `Emergency alert broadcast triggered successfully for ${zoneName}.`,
    alert: emergencyAlert
  });
});

module.exports = router;
