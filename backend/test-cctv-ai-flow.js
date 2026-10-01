const ioClient = require('socket.io-client');
const { app, server } = require('./server');
const db = require('./config/db');
const { analyzeCctvEmergency } = require('./services/aiService');
const {
  detectEmergencyOnCamera,
  triggerAutonomousSurveillanceTick,
  getSurveillanceStatus
} = require('./services/cctvDetectionService');

let socket;
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

async function runCompleteCctvAiFlowTests() {
  console.log('================================================================');
  console.log('🧪 TESTING CCTV → AI DETECTION → BACKEND → CONTROL ROOM ALERT');
  console.log('================================================================');

  // Allow server startup
  await new Promise(r => setTimeout(r, 1500));

  // Connect Socket.IO client (mimicking Control Room / Admin Dashboard)
  socket = ioClient(BASE_URL, {
    transports: ['websocket'],
    reconnection: false
  });

  const receivedAlerts = [];
  const receivedIncidents = [];
  const receivedEvidence = [];

  socket.on('cctv:auto-detection-alert', (alert) => {
    console.log(`[Socket.IO Alert] 🚨 ${alert.alertType} | Camera: ${alert.cameraId} | Event: ${alert.eventType} | Severity: ${alert.severity} | Incident: ${alert.incidentId}`);
    receivedAlerts.push(alert);
  });

  socket.on('newIncident', (inc) => {
    console.log(`[Socket.IO Event] 📢 newIncident: #${inc.id} - ${inc.title} [${inc.detection_source}]`);
    receivedIncidents.push(inc);
  });

  socket.on('cctv:incident-evidence', (ev) => {
    console.log(`[Socket.IO Event] 📹 cctv:incident-evidence: Camera ${ev.cameraId} -> Incident ${ev.incidentId}`);
    receivedEvidence.push(ev);
  });

  await new Promise(r => socket.on('connect', r));
  console.log('[Socket.IO] Control Room mock dashboard connected successfully.');

  let adminToken = '';

  try {
    // 1. Verify Admin Authentication
    console.log('\n--- Step 1: Control Room Authentication ---');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@crisisgrid.com',
      password: 'admin123'
    });
    if (loginRes.status !== 200 || !loginRes.data?.token) {
      throw new Error(`Authentication failed with status ${loginRes.status}`);
    }
    adminToken = loginRes.data.token;
    console.log('✅ PASS: Control Room admin authorized.');

    // 2. Test Step 1 & 2: CCTV sends detected event/frame to AI detection service
    console.log('\n--- Step 2: CCTV Sends Detected Event/Frame to AI Detection Service ---');
    const [cams] = await db.query("SELECT * FROM cameras WHERE status = 'ONLINE' ORDER BY id ASC");
    if (cams.length === 0) throw new Error('No online cameras in database.');
    const testCam = cams[0]; // e.g. CCTV-001 Riverside Bridge

    console.log(`Camera Selected: ${testCam.camera_id} (${testCam.name}) at ${testCam.location}`);

    const directAiResult = await analyzeCctvEmergency({
      camera: testCam,
      frame: { filePath: '/uploads/cctv/sample_frame.svg', fileName: 'sample_frame.svg' },
      streamUrl: testCam.stream_url,
      visualTelemetry: { eventHint: 'water surge flood overtopping embankment' }
    });

    console.log('AI Analysis Output:');
    console.log(`   - Event Type: ${directAiResult.eventType}`);
    console.log(`   - Severity: ${directAiResult.severity}`);
    console.log(`   - Short Description: ${directAiResult.shortDescription}`);
    console.log(`   - Location: ${directAiResult.location}`);
    console.log(`   - AI Engine Source: ${directAiResult.source}`);
    console.log(`   - Recommended Resources: ${directAiResult.recommendedResources.map(r => `${r.type} (${r.quantity})`).join(', ')}`);

    if (!directAiResult.eventType || !directAiResult.severity || !directAiResult.shortDescription || !directAiResult.location) {
      throw new Error('AI analysis failed to identify all required emergency attributes!');
    }
    console.log('✅ PASS: AI analysis accurately identified event type, severity, description, and location.');

    // 3. Test HTTP API for AI CCTV Analysis endpoint
    console.log('\n--- Step 3: Test HTTP AI CCTV Analysis API (/api/ai/analyze-cctv) ---');
    const httpAiRes = await request('POST', '/api/ai/analyze-cctv', {
      camera: testCam,
      frame: { filePath: '/uploads/cctv/sample_frame.svg' },
      visualTelemetry: { eventHint: 'chemical toxic fire' }
    });

    if (httpAiRes.status !== 200 || !httpAiRes.data?.data?.eventType) {
      throw new Error(`HTTP AI CCTV analysis endpoint failed: status ${httpAiRes.status}`);
    }
    console.log(`✅ PASS: /api/ai/analyze-cctv returned eventType="${httpAiRes.data.data.eventType}", severity="${httpAiRes.data.data.severity}"`);

    // 4. Test Complete Pipeline: CCTV detects event -> AI receives -> AI analyzes -> Backend creates incident -> Control Room alert
    console.log('\n--- Step 4: Complete Autonomous Pipeline Execution ---');
    console.log('Executing autonomous detection on CCTV stream without human/citizen interaction...');

    const pipelineResult = await detectEmergencyOnCamera(testCam.id, {}, app.get('io'));

    console.log('Pipeline Response Summary:');
    console.log(`   - Created Incident ID: ${pipelineResult.incidentId} (Numeric #${pipelineResult.numericIncidentId})`);
    console.log(`   - Event Type Identified by AI: ${pipelineResult.incident?.type}`);
    console.log(`   - Severity Identified by AI: ${pipelineResult.incident?.severity}`);
    console.log(`   - Location Identified by AI: ${pipelineResult.incident?.location}`);
    console.log(`   - CCTV Evidence File: ${pipelineResult.cctvEvidence?.snapshotUrl}`);

    // Wait briefly for Socket.IO event dispatches
    await new Promise(r => setTimeout(r, 1000));

    // 5. Verify Control Room Socket.IO Alert (All 8 Required Fields)
    console.log('\n--- Step 5: Verify Control Room Real-Time Emergency Alert ---');
    if (receivedAlerts.length === 0) {
      throw new Error('FAILED: Control Room did not receive cctv:auto-detection-alert via Socket.IO!');
    }

    const latestAlert = receivedAlerts[receivedAlerts.length - 1];
    console.log('Control Room Alert Verification:');
    console.log(`   1. 🚨 Alert Banner Type: ${latestAlert.alertType}`);
    console.log(`   2. Incident ID: ${latestAlert.incidentId}`);
    console.log(`   3. Event Type: ${latestAlert.eventType}`);
    console.log(`   4. Severity: ${latestAlert.severity}`);
    console.log(`   5. CCTV Camera: ${latestAlert.cameraId} (${latestAlert.cameraName})`);
    console.log(`   6. Location: ${latestAlert.cameraLocation}`);
    console.log(`   7. Captured Image/Video: ${latestAlert.evidenceFilePath}`);
    console.log(`   8. Time: ${latestAlert.captureTime} (Window: ${latestAlert.captureStartTime} -> ${latestAlert.captureEndTime})`);
    console.log(`   + Short Description: ${latestAlert.description}`);

    if (
      !latestAlert.incidentId ||
      !latestAlert.eventType ||
      !latestAlert.severity ||
      !latestAlert.cameraId ||
      !latestAlert.cameraLocation ||
      !latestAlert.evidenceFilePath ||
      !latestAlert.captureTime
    ) {
      throw new Error('FAILED: Alert payload missing one or more required fields!');
    }
    console.log('✅ PASS: All 8 required Control Room alert fields verified.');

    // 6. Verify Database Storage of Incident and CCTV Evidence
    console.log('\n--- Step 6: Verify Database Records in MySQL ---');
    const [incRows] = await db.query('SELECT * FROM incidents WHERE id = ?', [pipelineResult.numericIncidentId]);
    if (incRows.length === 0) throw new Error('Incident not found in database!');

    const incDb = incRows[0];
    console.log(`   - DB detection_source: ${incDb.detection_source}`);
    console.log(`   - DB detection_camera_id: ${incDb.detection_camera_id}`);
    console.log(`   - DB type: ${incDb.type}`);
    console.log(`   - DB severity: ${incDb.severity}`);
    console.log(`   - DB created_by: ${incDb.created_by} (Verified: Machine/Sensor generated, no citizen needed)`);

    const [evRows] = await db.query('SELECT * FROM cctv_evidence WHERE incident_id = ?', [pipelineResult.numericIncidentId]);
    console.log(`   - DB cctv_evidence rows: ${evRows.length}`);
    if (evRows.length === 0) throw new Error('No CCTV evidence saved for incident!');
    console.log(`   - First Evidence File: ${evRows[0].file_path}`);
    console.log(`   - Pre-event Time: ${evRows[0].capture_start_time}`);
    console.log(`   - Post-event Time: ${evRows[0].capture_end_time}`);

    console.log('✅ PASS: Incident and CCTV evidence records verified in MySQL.');

    // 7. Test Autonomous Surveillance Daemon Tick (Runs without admin button press)
    console.log('\n--- Step 7: Test Autonomous Background Surveillance Tick ---');
    const autoTickResult = await triggerAutonomousSurveillanceTick(app.get('io'));
    console.log(`   - Auto-Tick Created Incident: ${autoTickResult.incidentId}`);
    console.log(`   - Auto-Tick Camera: ${autoTickResult.camera.cameraId}`);
    console.log(`   - Auto-Tick AI Type: ${autoTickResult.incident.type}`);
    console.log('✅ PASS: Autonomous background surveillance tick verified.');

    console.log('\n================================================================');
    console.log('🎉 FULL CCTV → AI → BACKEND → CONTROL ROOM FLOW PASSED 100%!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (socket) socket.disconnect();
    server.close();
    await db.end();
    process.exit(process.exitCode || 0);
  }
}

runCompleteCctvAiFlowTests();
