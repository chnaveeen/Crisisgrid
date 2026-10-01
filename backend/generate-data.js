const fs = require('fs');
const path = require('path');

const zones = [
  {
    id: 1,
    code: "ZONE-A",
    name: "Hill View",
    risk: "CRITICAL",
    riskScore: 87,
    floodProbability: 91,
    rainfall: 87,
    riverLevel: 4.8,
    soilMoisture: 82,
    slope: "28° (Steep)",
    elevation: "142 m",
    population: 12450,
    vulnerabilities: {
      children: 2840,
      elderly: 1920,
      hospitals: 1,
      schools: 3,
      criticalInfra: "Substation Alpha-3"
    },
    lat: 13.0827,
    lng: 80.2707,
    dangerLevel: 4.5,
    recommendedAction: "Initiate immediate evacuation of vulnerable households along hillside drainage corridors.",
    evacuationRoute: {
      from: "Hill View Ridge",
      corridor: "Main Hill Road -> North Bypass",
      transitHub: "Community Hall & Sports Complex",
      destination: "Highland Safe Center 1",
      distance: "3.8 km",
      estimatedTime: "18 mins",
      shelterCapacity: "3,500 / 5,000 (70% capacity)"
    }
  },
  {
    id: 2,
    code: "ZONE-B",
    name: "Valley Road",
    risk: "HIGH",
    riskScore: 68,
    floodProbability: 72,
    rainfall: 74,
    riverLevel: 4.3,
    soilMoisture: 76,
    slope: "14° (Moderate)",
    elevation: "88 m",
    population: 8320,
    vulnerabilities: {
      children: 1850,
      elderly: 1240,
      hospitals: 1,
      schools: 2,
      criticalInfra: "Valley Water Pumping Station"
    },
    lat: 13.0715,
    lng: 80.2520,
    dangerLevel: 4.5,
    recommendedAction: "Deploy emergency response teams and position rescue craft near culverts.",
    evacuationRoute: {
      from: "Valley Road Sector 4",
      corridor: "West Arterial Expressway",
      transitHub: "Central High School Ground",
      destination: "West Ridge Camp",
      distance: "2.4 km",
      estimatedTime: "12 mins",
      shelterCapacity: "1,900 / 3,000 (63% capacity)"
    }
  },
  {
    id: 3,
    code: "ZONE-C",
    name: "Riverside",
    risk: "MODERATE",
    riskScore: 46,
    floodProbability: 48,
    rainfall: 52,
    riverLevel: 3.9,
    soilMoisture: 64,
    slope: "5° (Gentle)",
    elevation: "54 m",
    population: 5760,
    vulnerabilities: {
      children: 1120,
      elderly: 810,
      hospitals: 1,
      schools: 2,
      criticalInfra: "Riverside Bridge Embankment"
    },
    lat: 13.0580,
    lng: 80.2640,
    dangerLevel: 4.5,
    recommendedAction: "Issue public advisory, inspect sluice gates, restrict pedestrian access to riverbanks.",
    evacuationRoute: {
      from: "Riverside Promenade",
      corridor: "Riverbank Link Road -> Elevated Flyover",
      transitHub: "City Town Hall",
      destination: "Eastern High Ground Relief Hub",
      distance: "4.2 km",
      estimatedTime: "22 mins",
      shelterCapacity: "1,200 / 2,500 (48% capacity)"
    }
  },
  {
    id: 4,
    code: "ZONE-D",
    name: "Market Area",
    risk: "LOW",
    riskScore: 24,
    floodProbability: 22,
    rainfall: 28,
    riverLevel: 2.8,
    soilMoisture: 42,
    slope: "2° (Flat/Paved)",
    elevation: "62 m",
    population: 2100,
    vulnerabilities: {
      children: 380,
      elderly: 290,
      hospitals: 0,
      schools: 1,
      criticalInfra: "Municipal Transformer Yard"
    },
    lat: 13.0910,
    lng: 80.2820,
    dangerLevel: 4.5,
    recommendedAction: "Continuous monitoring of storm-water drainage; keep standby dewatering pumps ready.",
    evacuationRoute: {
      from: "Market Central Square",
      corridor: "Commercial Blvd -> Ring Road",
      transitHub: "Civic Center Annex",
      destination: "Metropolitan Stadium Arena",
      distance: "1.8 km",
      estimatedTime: "9 mins",
      shelterCapacity: "400 / 2,000 (20% capacity)"
    }
  },
  {
    id: 5,
    code: "ZONE-E",
    name: "Foothill Pass",
    risk: "HIGH",
    riskScore: 71,
    floodProbability: 75,
    rainfall: 79,
    riverLevel: 4.4,
    soilMoisture: 79,
    slope: "24° (Steep Catchment)",
    elevation: "115 m",
    population: 3400,
    vulnerabilities: {
      children: 620,
      elderly: 490,
      hospitals: 0,
      schools: 1,
      criticalInfra: "Gorge Culvert Bridge"
    },
    lat: 13.0450,
    lng: 80.2410,
    dangerLevel: 4.5,
    recommendedAction: "Barricade hazardous hairpin turns; activate hill stream diversion channel.",
    evacuationRoute: {
      from: "Foothill Pass Entry",
      corridor: "Gorge Highway -> Ridge Bypass",
      transitHub: "Forest Rest Complex",
      destination: "Plateau Relief Center",
      distance: "3.1 km",
      estimatedTime: "15 mins",
      shelterCapacity: "850 / 1,500 (56% capacity)"
    }
  }
];

const sensors = {
  current: {
    rainfall: { value: 87, unit: "mm/hr", trend: "+18%", status: "Severe Intensity", icon: "CloudRain" },
    riverLevel: { value: 4.8, unit: "m", threshold: 4.5, trend: "+0.6 m", status: "Above Danger Line", icon: "Waves" },
    soilMoisture: { value: 82, unit: "%", trend: "+12%", status: "Hydraulic Saturation", icon: "Droplets" },
    weather: { condition: "Heavy Convective Rain", temp: "24.2°C", humidity: "96%", wind: "38 km/h NW", icon: "Wind" },
    terrain: { slope: "28° Steep Slope", runOffSpeed: "High Velocity (3.4 m/s)", elevation: "142 m", icon: "Mountain" },
    historicalRisk: { level: "High Vulnerability", events: "3 major events in 5 yrs", recurrence: "1-in-10 Year Flash Flood", icon: "History" },
    satelliteRadar: { cloudTopTemp: "-64°C", reflectivity: "54 dBZ", precipitableWater: "68 mm", icon: "Radio" }
  },
  rainfallSeries: [
    { time: "18:00", rainfall: 22, riverLevel: 2.9, predicted: 24 },
    { time: "18:10", rainfall: 31, riverLevel: 3.2, predicted: 33 },
    { time: "18:20", rainfall: 42, riverLevel: 3.5, predicted: 45 },
    { time: "18:30", rainfall: 55, riverLevel: 3.8, predicted: 58 },
    { time: "18:40", rainfall: 63, riverLevel: 4.1, predicted: 66 },
    { time: "18:50", rainfall: 76, riverLevel: 4.5, predicted: 78 },
    { time: "19:00", rainfall: 87, riverLevel: 4.8, predicted: 89 }
  ],
  forecastSeries: [
    { time: "19:10", expectedRain: 92, expectedRiver: 5.0, riskIndex: 89 },
    { time: "19:20", expectedRain: 95, expectedRiver: 5.2, riskIndex: 93 },
    { time: "19:30", expectedRain: 90, expectedRiver: 5.3, riskIndex: 94 },
    { time: "19:40", expectedRain: 84, expectedRiver: 5.2, riskIndex: 91 },
    { time: "19:50", expectedRain: 75, expectedRiver: 5.0, riskIndex: 85 },
    { time: "20:00", expectedRain: 65, expectedRiver: 4.7, riskIndex: 78 }
  ]
};

const predictions = {
  overallRisk: "HIGH",
  riskScore: 84,
  maxRiskScore: 100,
  floodProbability: 87,
  confidence: 92,
  predictionWindow: "Next 60 minutes",
  timeframe: "19:00 - 20:00 IST",
  modelName: "FloodShield-HydroAI Ensemble v2.4 (Deterministic Prototype)",
  explanation: "High rainfall intensity (87 mm/hr) combined with elevated river level (4.8 m, exceeding 4.5 m danger line) and saturated soil (82%) is rapidly accelerating surface runoff and increasing flash-flood probability in Hill View and Valley Road.",
  pipeline: [
    { step: 1, name: "Multi-Source Data", desc: "Telemetry ingestion from rainfall gauges, radar, river sensors, soil moisture & DEM terrain", status: "Active (7 Streams)" },
    { step: 2, name: "Data Processing", desc: "Noise filtering, anomaly rejection, missing data imputation, temporal sync", status: "Synchronized (10s delay)" },
    { step: 3, name: "Feature Extraction", desc: "Runoff velocity, catchment saturation index, elevation slope gradient, crest surge rate", status: "Calculated" },
    { step: 4, name: "AI Risk Model", desc: "Deterministic multi-factor hydro-statistical weighted scoring algorithm", status: "Ensemble Scored" },
    { step: 5, name: "Hyper-Local Score", desc: "0-100 micro-catchment hazard indexing across 5 vulnerable zones", status: "Zone Risk Ranked" },
    { step: 6, name: "Early Warning", desc: "Automated alert dispatch, cell broadcast triggers, evacuation route guidance", status: "Alerts Dispatched" }
  ],
  weights: [
    { factor: "Rainfall Intensity", weight: 35, currentContribution: 30.5, formula: "mm/hr scaled against 100 mm/hr flash flood baseline" },
    { factor: "River Stage & Rate of Rise", weight: 25, currentContribution: 24.0, formula: "Surge relative to 4.5 m critical danger threshold" },
    { factor: "Soil Moisture Saturation", weight: 20, currentContribution: 16.4, formula: "Hydraulic retention exhaustion > 80%" },
    { factor: "Terrain Slope & Runoff", weight: 10, currentContribution: 8.5, formula: "Steep elevation differential accelerating cresting" },
    { factor: "Historical Flood Antecedent", weight: 10, currentContribution: 8.6, formula: "Historical frequency & structural vulnerability" }
  ],
  classificationThresholds: [
    { range: "0 - 30", level: "LOW", color: "#10b981", action: "Routine Monitoring" },
    { range: "31 - 50", level: "MODERATE", color: "#eab308", action: "Advisory & Gate Standby" },
    { range: "51 - 75", level: "HIGH", color: "#f97316", action: "Alert Teams & Traffic Restrictions" },
    { range: "76 - 100", level: "CRITICAL", color: "#ef4444", action: "Mandatory Immediate Evacuation" }
  ]
};

const alerts = [
  {
    id: "ALT-2026-881",
    timestamp: "18:55 IST",
    zone: "Hill View (Zone A)",
    riskLevel: "CRITICAL",
    category: "EVACUATION DIRECTIVE",
    title: "Flash Flood Risk Detected in Hill View Zone",
    message: "Severe convective storm cell concentrated over Hill View ridge. Projected flash flood surge within 30-45 minutes.",
    recommendedAction: "Initiate immediate evacuation of vulnerable households along hillside drainage corridors.",
    status: "ACTIVE",
    broadcastSent: true
  },
  {
    id: "ALT-2026-880",
    timestamp: "18:50 IST",
    zone: "Riverside Basin (Zone C)",
    riskLevel: "HIGH",
    category: "THRESHOLD EXCEEDED",
    title: "River Level Exceeded Danger Warning Threshold (4.5m)",
    message: "Upstream river gauge reads 4.8 m, crossing the critical 4.5 m danger mark. Rate of rise is +0.6 m/hr.",
    recommendedAction: "Sound flood sirens, erect temporary barrier gates, and close low-lying bridges.",
    status: "ACTIVE",
    broadcastSent: true
  },
  {
    id: "ALT-2026-879",
    timestamp: "18:42 IST",
    zone: "Valley Road (Zone B)",
    riskLevel: "HIGH",
    category: "RAPID INTENSIFICATION",
    title: "Rainfall Intensity Rapidly Increasing",
    message: "Precipitation escalated from 55 mm/hr to 74 mm/hr in 20 minutes. Runoff velocity reaching peak canal capacity.",
    recommendedAction: "Deploy SDRF emergency rescue teams and position suction pumps.",
    status: "ACTIVE",
    broadcastSent: true
  },
  {
    id: "ALT-2026-878",
    timestamp: "18:30 IST",
    zone: "Foothill Pass (Zone E)",
    riskLevel: "MODERATE",
    category: "SATURATION WARNING",
    title: "Soil Moisture Approaching Complete Saturation",
    message: "Soil moisture reached 82%, exhausting infiltration capacity. All further rainfall converts to immediate surface runoff.",
    recommendedAction: "Restrict hillside commuter traffic and alert forest checkposts.",
    status: "ACKNOWLEDGED",
    broadcastSent: false
  },
  {
    id: "ALT-2026-877",
    timestamp: "18:15 IST",
    zone: "Market Area (Zone D)",
    riskLevel: "LOW",
    category: "ADVISORY",
    title: "Precautionary Storm Water Drain Clearance",
    message: "Municipal dewatering pumps placed on hot standby. Drainage flow unobstructed.",
    recommendedAction: "Maintain routine pump station log and monitor catch basins.",
    status: "MONITORING",
    broadcastSent: false
  }
];

const scenarios = {
  "normal-weather": {
    name: "Normal Weather",
    id: "normal-weather",
    regionalRisk: "LOW",
    riskScore: 22,
    floodProbability: 15,
    confidence: 95,
    sensors: {
      rainfall: { value: 12, unit: "mm/hr", trend: "-4%", status: "Light Showers" },
      riverLevel: { value: 2.1, unit: "m", threshold: 4.5, trend: "Stable", status: "Normal Level" },
      soilMoisture: { value: 40, unit: "%", trend: "-2%", status: "Dry / Absorbing" },
      weather: { condition: "Partly Cloudy", temp: "29.4°C", humidity: "62%", wind: "14 km/h S" },
      terrain: { slope: "28° Slope", runOffSpeed: "Negligible", elevation: "142 m" },
      historicalRisk: { level: "Low Base Risk", events: "Normal drainage profile" }
    },
    zones: [
      { id: 1, name: "Hill View", risk: "LOW", riskScore: 24, rainfall: 14, riverLevel: 2.2, soilMoisture: 42 },
      { id: 2, name: "Valley Road", risk: "LOW", riskScore: 20, rainfall: 12, riverLevel: 2.1, soilMoisture: 38 },
      { id: 3, name: "Riverside", risk: "LOW", riskScore: 22, rainfall: 11, riverLevel: 2.0, soilMoisture: 40 },
      { id: 4, name: "Market Area", risk: "LOW", riskScore: 16, rainfall: 9, riverLevel: 1.8, soilMoisture: 35 },
      { id: 5, name: "Foothill Pass", risk: "LOW", riskScore: 25, rainfall: 15, riverLevel: 2.3, soilMoisture: 44 }
    ],
    explanation: "Atmospheric and hydrological conditions remain well within safe operating margins. No imminent threat of flash flooding."
  },
  "heavy-rainfall": {
    name: "Heavy Rainfall",
    id: "heavy-rainfall",
    regionalRisk: "HIGH",
    riskScore: 68,
    floodProbability: 71,
    confidence: 90,
    sensors: {
      rainfall: { value: 58, unit: "mm/hr", trend: "+14%", status: "Heavy Rain" },
      riverLevel: { value: 3.7, unit: "m", threshold: 4.5, trend: "+0.3 m", status: "Rising Steadily" },
      soilMoisture: { value: 68, unit: "%", trend: "+8%", status: "High Moisture" },
      weather: { condition: "Heavy Rain Squall", temp: "26.1°C", humidity: "88%", wind: "28 km/h SW" },
      terrain: { slope: "28° Slope", runOffSpeed: "Moderate (1.8 m/s)", elevation: "142 m" },
      historicalRisk: { level: "Medium Risk", events: "Seasonal swelling" }
    },
    zones: [
      { id: 1, name: "Hill View", risk: "HIGH", riskScore: 72, rainfall: 62, riverLevel: 3.9, soilMoisture: 72 },
      { id: 2, name: "Valley Road", risk: "HIGH", riskScore: 68, rainfall: 58, riverLevel: 3.7, soilMoisture: 68 },
      { id: 3, name: "Riverside", risk: "MODERATE", riskScore: 48, rainfall: 50, riverLevel: 3.5, soilMoisture: 62 },
      { id: 4, name: "Market Area", risk: "LOW", riskScore: 28, rainfall: 34, riverLevel: 2.8, soilMoisture: 46 },
      { id: 5, name: "Foothill Pass", risk: "HIGH", riskScore: 65, rainfall: 56, riverLevel: 3.6, soilMoisture: 66 }
    ],
    explanation: "Persistent heavy precipitation is increasing natural drainage saturation. Valley corridors and low bridges are under close watch."
  },
  "extreme-rainfall": {
    name: "Extreme Rainfall",
    id: "extreme-rainfall",
    regionalRisk: "CRITICAL",
    riskScore: 89,
    floodProbability: 93,
    confidence: 94,
    sensors: {
      rainfall: { value: 94, unit: "mm/hr", trend: "+24%", status: "Extreme Cloudburst" },
      riverLevel: { value: 4.9, unit: "m", threshold: 4.5, trend: "+0.8 m", status: "BREACHED CRITICAL" },
      soilMoisture: { value: 88, unit: "%", trend: "+14%", status: "Total Saturation" },
      weather: { condition: "Violent Convective Downpour", temp: "23.5°C", humidity: "98%", wind: "44 km/h W" },
      terrain: { slope: "28° Slope", runOffSpeed: "High Velocity (3.9 m/s)", elevation: "142 m" },
      historicalRisk: { level: "Severe Historical Precedent", events: "Flash inundation expected" }
    },
    zones: [
      { id: 1, name: "Hill View", risk: "CRITICAL", riskScore: 92, rainfall: 96, riverLevel: 5.1, soilMoisture: 90 },
      { id: 2, name: "Valley Road", risk: "CRITICAL", riskScore: 88, rainfall: 92, riverLevel: 4.8, soilMoisture: 86 },
      { id: 3, name: "Riverside", risk: "HIGH", riskScore: 74, rainfall: 82, riverLevel: 4.6, soilMoisture: 82 },
      { id: 4, name: "Market Area", risk: "MODERATE", riskScore: 44, rainfall: 48, riverLevel: 3.4, soilMoisture: 58 },
      { id: 5, name: "Foothill Pass", risk: "CRITICAL", riskScore: 86, rainfall: 90, riverLevel: 4.9, soilMoisture: 85 }
    ],
    explanation: "Extreme cloudburst conditions detected. Watercourses have breached danger marks. Immediate emergency evacuation activated for critical zones."
  },
  "river-overflow": {
    name: "River Overflow",
    id: "river-overflow",
    regionalRisk: "CRITICAL",
    riskScore: 91,
    floodProbability: 95,
    confidence: 96,
    sensors: {
      rainfall: { value: 72, unit: "mm/hr", trend: "+8%", status: "Continuous Inundation" },
      riverLevel: { value: 5.2, unit: "m", threshold: 4.5, trend: "+1.1 m", status: "EMBANKMENT OVERTOPPING" },
      soilMoisture: { value: 92, unit: "%", trend: "+6%", status: "Submerged Topsoil" },
      weather: { condition: "Continuous Rain", temp: "24.0°C", humidity: "97%", wind: "32 km/h W" },
      terrain: { slope: "5° River Floodplain", runOffSpeed: "Overtopping Sluices", elevation: "54 m" },
      historicalRisk: { level: "Extreme River Flooding", events: "Water entering residential blocks" }
    },
    zones: [
      { id: 1, name: "Hill View", risk: "HIGH", riskScore: 76, rainfall: 74, riverLevel: 4.6, soilMoisture: 84 },
      { id: 2, name: "Valley Road", risk: "CRITICAL", riskScore: 90, rainfall: 78, riverLevel: 5.0, soilMoisture: 90 },
      { id: 3, name: "Riverside", risk: "CRITICAL", riskScore: 95, rainfall: 80, riverLevel: 5.3, soilMoisture: 94 },
      { id: 4, name: "Market Area", risk: "HIGH", riskScore: 68, rainfall: 58, riverLevel: 4.2, soilMoisture: 72 },
      { id: 5, name: "Foothill Pass", risk: "HIGH", riskScore: 74, rainfall: 70, riverLevel: 4.7, soilMoisture: 82 }
    ],
    explanation: "Severe river overflow and embankment overtopping in Riverside and Valley Road. Emergency flood barriers deployed."
  },
  "flash-flood-emergency": {
    name: "Flash Flood Emergency",
    id: "flash-flood-emergency",
    regionalRisk: "CRITICAL",
    riskScore: 98,
    floodProbability: 99,
    confidence: 97,
    sensors: {
      rainfall: { value: 112, unit: "mm/hr", trend: "+36%", status: "CATASTROPHIC CLOUDBURST" },
      riverLevel: { value: 5.6, unit: "m", threshold: 4.5, trend: "+1.5 m", status: "MAJOR SURGE WAVE" },
      soilMoisture: { value: 96, unit: "%", trend: "+16%", status: "Complete Liquefaction" },
      weather: { condition: "Severe Severe Convective Storm", temp: "22.8°C", humidity: "99%", wind: "52 km/h WNW" },
      terrain: { slope: "28° Slope", runOffSpeed: "Torrential Surge (5.2 m/s)", elevation: "142 m" },
      historicalRisk: { level: "1-in-50 Year Event", events: "Multiple bridges submerged" }
    },
    zones: [
      { id: 1, name: "Hill View", risk: "CRITICAL", riskScore: 98, rainfall: 115, riverLevel: 5.6, soilMoisture: 97 },
      { id: 2, name: "Valley Road", risk: "CRITICAL", riskScore: 96, rainfall: 110, riverLevel: 5.4, soilMoisture: 95 },
      { id: 3, name: "Riverside", risk: "CRITICAL", riskScore: 94, rainfall: 104, riverLevel: 5.5, soilMoisture: 96 },
      { id: 4, name: "Market Area", risk: "HIGH", riskScore: 72, rainfall: 75, riverLevel: 4.4, soilMoisture: 78 },
      { id: 5, name: "Foothill Pass", risk: "CRITICAL", riskScore: 95, rainfall: 108, riverLevel: 5.3, soilMoisture: 93 }
    ],
    explanation: "Catastrophic flash flood emergency declared across entire basin. Maximum priority emergency response and complete evacuation in effect."
  }
};

const dashboard = {
  systemTitle: "FloodShield AI",
  subtitle: "AI-Powered Hyper-Local Flash Flood Early Warning System",
  status: "ONLINE",
  lastUpdated: new Date().toISOString(),
  regionalRisk: "HIGH",
  confidence: 92,
  metrics: {
    rainfall: "87 mm/hr",
    riverLevel: "4.8 m",
    riverThreshold: "4.5 m",
    soilMoisture: "82%",
    predictionWindow: "Next 60 minutes",
    monitoredZones: 5,
    criticalZones: 1,
    highRiskZones: 2,
    populationProtected: 32030
  },
  analytics: {
    floodEventsMonitored: 128,
    warningsIssued: 34,
    highRiskZones: 7,
    peopleProtected: 48620,
    modelAccuracy: "92%",
    accuracyLabel: "Demo Model Accuracy",
    leadTimeAdvantage: "+45 mins vs traditional rain gauge systems"
  }
};

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(path.join(dataDir, 'zones.json'), JSON.stringify(zones, null, 2));
fs.writeFileSync(path.join(dataDir, 'sensors.json'), JSON.stringify(sensors, null, 2));
fs.writeFileSync(path.join(dataDir, 'predictions.json'), JSON.stringify(predictions, null, 2));
fs.writeFileSync(path.join(dataDir, 'alerts.json'), JSON.stringify(alerts, null, 2));
fs.writeFileSync(path.join(dataDir, 'scenarios.json'), JSON.stringify(scenarios, null, 2));
fs.writeFileSync(path.join(dataDir, 'dashboard.json'), JSON.stringify(dashboard, null, 2));

console.log("Successfully generated all mock JSON data files in backend/data/");
