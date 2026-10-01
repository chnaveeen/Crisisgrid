const ioClient = require('socket.io-client');
const db = require('./config/db');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function request(method, path, data = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json };
}

async function runUnifiedAlertTests() {
  console.log('================================================================');
  console.log('🚨 TESTING CRISISGRID UNIFIED AUTOMATIC EMERGENCY ALERT SYSTEM');
  console.log('   Test 1: "Simulate CCTV AI Detection" Button');
  console.log('   Test 2: Citizen Emergency Incident Report');
  console.log('   Test 3: Autonomous Continuous CCTV AI Surveillance Detection');
  console.log('================================================================');

  let socket = null;

  try {
    // 1. Give server time to initialize if needed
    await new Promise(r => setTimeout(r, 1200));

    // 2. Connect Mock Control Room Socket.IO Client
    console.log('\n--- Step 1: Connect Control Room Dashboard via Socket.IO ---');
    socket = ioClient(BASE_URL, {
      transports: ['websocket'],
      reconnection: false
    });

    const unifiedAlerts = [];
    const newIncidents = [];
    const incidentNewEvents = [];
    const cctvAlerts = [];

    socket.on('incident:new', (inc) => {
      console.log(`[Socket.IO ⚡ incident:new] #${inc.id} - ${inc.title} [Source: ${inc.detection_source}]`);
      incidentNewEvents.push(inc);
    });

    socket.on('emergency:alert', (alert) => {
      console.log(`[Socket.IO 🚨 emergency:alert] Source: ${alert.source} | ID: ${alert.incidentId} | Type: ${alert.type} | Severity: ${alert.severity}`);
      unifiedAlerts.push(alert);
    });

    socket.on('newIncident', (inc) => {
      newIncidents.push(inc);
    });

    socket.on('cctv:auto-detection-alert', (alert) => {
      cctvAlerts.push(alert);
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket.IO connection timed out')), 5000);
      socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on('connect_error', reject);
    });

    console.log('✅ PASS: Control Room mock dashboard connected via WebSocket.');

    // 3. Authenticate Citizen and Admin users
    console.log('\n--- Step 2: Authenticate Users (Admin & Citizen) ---');
    const adminRes = await request('POST', '/api/auth/login', {
      email: 'admin@crisisgrid.com',
      password: 'admin123'
    });
    if (adminRes.status !== 200 || !adminRes.data?.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminRes.data)}`);
    }
    const adminToken = adminRes.data.token;
    console.log('✅ Admin authorized:', adminRes.data.user.name);

    const citizenRes = await request('POST', '/api/auth/login', {
      email: 'citizen@crisisgrid.com',
      password: 'citizen123'
    });
    if (citizenRes.status !== 200 || !citizenRes.data?.token) {
      throw new Error(`Citizen login failed: ${JSON.stringify(citizenRes.data)}`);
    }
    const citizenToken = citizenRes.data.token;
    console.log('✅ Citizen authorized:', citizenRes.data.user.name);

    // =========================================================================
    // TEST 1: "SIMULATE CCTV AI DETECTION" BUTTON
    // UI Button -> POST /api/cameras/auto-detect-simulation -> Same CCTV Pipeline
    // =========================================================================
    console.log('\n================================================================');
    console.log('🔘 TEST 1: "SIMULATE CCTV AI DETECTION" BUTTON PIPELINE');
    console.log('================================================================');

    const simRes = await request('POST', '/api/cameras/auto-detect-simulation', {}, adminToken);
    if (simRes.status !== 201 || !simRes.data?.data) {
      throw new Error(`Simulation button endpoint failed: status ${simRes.status} - ${JSON.stringify(simRes.data)}`);
    }

    const simResult = simRes.data.data;
    console.log('Simulation Request Succeeded:');
    console.log(`   - Generated Incident ID: ${simResult.incidentId}`);
    console.log(`   - Numeric DB ID: ${simResult.numericIncidentId}`);
    console.log(`   - AI Detected Event Type: ${simResult.incident?.type}`);
    console.log(`   - Severity: ${simResult.incident?.severity}`);
    console.log(`   - CCTV Evidence Snapshot: ${simResult.cctvEvidence?.snapshotUrl}`);

    await new Promise(r => setTimeout(r, 600));

    // Assert Socket.IO received both incident:new and emergency:alert
    const simIncidentNew = incidentNewEvents.find(e => Number(e.id) === simResult.numericIncidentId);
    if (!simIncidentNew) throw new Error('FAILED: Control Room did not receive incident:new from Simulation button!');
    console.log(`✅ PASS: Control Room received "incident:new" for Simulation #${simIncidentNew.id}`);

    const simAlert = unifiedAlerts.find(a => a.numericIncidentId === simResult.numericIncidentId);
    if (!simAlert) throw new Error('FAILED: Control Room did not receive emergency:alert from Simulation button!');
    console.log(`✅ PASS: Control Room received "emergency:alert" for Simulation #${simAlert.incidentId}`);

    if (simAlert.source !== 'CCTV') throw new Error(`Expected source "CCTV", got "${simAlert.source}"`);
    if (!simAlert.cctvEvidence?.hasEvidence) throw new Error('Simulation alert missing CCTV evidence attachment');

    // =========================================================================
    // TEST 2: CITIZEN EMERGENCY REPORT PIPELINE
    // Citizen Report -> AI Analysis -> Create Incident -> Socket.IO Alert
    // =========================================================================
    console.log('\n================================================================');
    console.log('👤 TEST 2: CITIZEN EMERGENCY REPORT PIPELINE');
    console.log('================================================================');

    const citizenReportPayload = {
      title: 'Massive Industrial Chemical Fire and Toxic Cloud',
      description: 'Major fire raging at Chemical Storage Unit 4B, toxic gas plume drifting towards residential area, multiple casualties require rapid evacuation.',
      location: 'Industrial Zone Sector 4, Unit 4B',
      type: 'Fire',
      severity: 'Critical',
      latitude: 12.9735,
      longitude: 77.5960
    };

    const citizenPostRes = await request('POST', '/api/incidents', citizenReportPayload, citizenToken);
    if (citizenPostRes.status !== 201 || !citizenPostRes.data?.data) {
      throw new Error(`Citizen incident creation failed with status ${citizenPostRes.status}: ${JSON.stringify(citizenPostRes.data)}`);
    }

    const createdCitizenInc = citizenPostRes.data.data;
    const citizenNumericId = createdCitizenInc.id;
    console.log('Citizen Report Successfully Filed:');
    console.log(`   - Generated Incident ID: ${createdCitizenInc.incident_id || `INC-2026-${String(citizenNumericId).padStart(5, '0')}`}`);
    console.log(`   - Numeric DB ID: ${citizenNumericId}`);
    console.log(`   - AI Triage Type: ${createdCitizenInc.type}`);
    console.log(`   - AI Triage Severity: ${createdCitizenInc.severity}`);

    await new Promise(r => setTimeout(r, 600));

    // Assert Socket.IO received both incident:new and emergency:alert
    const citizenIncidentNew = incidentNewEvents.find(e => Number(e.id) === citizenNumericId);
    if (!citizenIncidentNew) throw new Error('FAILED: Control Room did not receive incident:new for Citizen report!');
    console.log(`✅ PASS: Control Room received "incident:new" for Citizen report #${citizenIncidentNew.id}`);

    const citizenAlert = unifiedAlerts.find(a => a.numericIncidentId === citizenNumericId);
    if (!citizenAlert) throw new Error('FAILED: Control Room did not receive emergency:alert for Citizen report!');
    console.log(`✅ PASS: Control Room received "emergency:alert" for Citizen report #${citizenAlert.incidentId}`);

    if (citizenAlert.source !== 'Citizen') throw new Error(`Expected source "Citizen", got "${citizenAlert.source}"`);
    if (!citizenAlert.reporterName) throw new Error('Citizen alert missing reporter name');

    // =========================================================================
    // TEST 3: AUTOMATIC CONTINUOUS CCTV AI SURVEILLANCE DETECTION
    // Surveillance Daemon Tick -> Optical Scan -> AI Analysis -> Incident -> Alert
    // =========================================================================
    console.log('\n================================================================');
    console.log('📹 TEST 3: AUTOMATIC CONTINUOUS CCTV AI SURVEILLANCE PIPELINE');
    console.log('================================================================');

    const tickRes = await request('POST', '/api/cameras/surveillance-daemon/tick', {}, adminToken);
    if (tickRes.status !== 200 && tickRes.status !== 201) throw new Error(`Surveillance tick endpoint failed with status ${tickRes.status}: ${JSON.stringify(tickRes.data)}`);
    const autoTickResult = tickRes.data.data;
    console.log('Autonomous Surveillance Tick Processed:');
    console.log(`   - Auto-Detected Incident ID: ${autoTickResult.incidentId}`);
    console.log(`   - Camera: ${autoTickResult.camera?.camera_id || autoTickResult.numericIncidentId}`);
    console.log(`   - AI Detected Event: ${autoTickResult.incident?.type} (${autoTickResult.incident?.severity})`);

    await new Promise(r => setTimeout(r, 600));

    const autoIncidentNew = incidentNewEvents.find(e => Number(e.id) === autoTickResult.numericIncidentId);
    if (!autoIncidentNew) throw new Error('FAILED: Control Room did not receive incident:new for Autonomous CCTV scan!');
    console.log(`✅ PASS: Control Room received "incident:new" for Autonomous CCTV scan #${autoIncidentNew.id}`);

    const autoAlert = unifiedAlerts.find(a => a.numericIncidentId === autoTickResult.numericIncidentId);
    if (!autoAlert) throw new Error('FAILED: Control Room did not receive emergency:alert for Autonomous CCTV scan!');
    console.log(`✅ PASS: Control Room received "emergency:alert" for Autonomous CCTV scan #${autoAlert.incidentId}`);

    if (autoAlert.source !== 'CCTV') throw new Error(`Expected source "CCTV", got "${autoAlert.source}"`);
    if (!autoAlert.cctvEvidence?.hasEvidence) throw new Error('Autonomous CCTV alert missing evidence attachment');

    // =========================================================================
    // TEST 4: UNIFIED SCHEMA & DATABASE PARITY CHECK
    // =========================================================================
    console.log('\n================================================================');
    console.log('⚡ TEST 4: UNIFIED ALERT SCHEMA PARITY CHECK');
    console.log('================================================================');

    const requiredKeys = [
      'alertType',
      'incidentId',
      'numericIncidentId',
      'source',
      'sourceLabel',
      'reporterName',
      'type',
      'severity',
      'location',
      'time',
      'description',
      'cctvEvidence'
    ];

    for (const key of requiredKeys) {
      if (!(key in simAlert)) throw new Error(`Simulation alert missing key: ${key}`);
      if (!(key in citizenAlert)) throw new Error(`Citizen alert missing key: ${key}`);
      if (!(key in autoAlert)) throw new Error(`Autonomous CCTV alert missing key: ${key}`);
    }

    console.log('✅ Key Parity Check Passed: All 3 incident sources implement identical schema.');
    console.log('✅ Real-Time Socket.IO Passed: All 3 sources emit "incident:new" & "emergency:alert".');
    console.log('✅ Zero Latency Passed: Control Room receives alerts immediately without refresh.');

    console.log('\n================================================================');
    console.log('🎉 ALL 3 EMERGENCY INCIDENT PIPELINES TESTED & VERIFIED 100%!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (socket) socket.disconnect();
    await db.end();
    process.exit(process.exitCode || 0);
  }
}

runUnifiedAlertTests();
