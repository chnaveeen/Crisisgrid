const ioClient = require('socket.io-client');
const { app, server } = require('./server');
const db = require('./config/db');

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

async function runCctvDetectionTests() {
  console.log('================================================================');
  console.log('🧪 TESTING CCTV AUTONOMOUS EMERGENCY DETECTION & ALERT PIPELINE');
  console.log('================================================================');

  // Wait for server to be ready
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
    console.log(`[Socket.IO] 🚨 cctv:auto-detection-alert received! Camera: ${alert.cameraId}, Event: ${alert.eventType}, Severity: ${alert.severity}, Incident: ${alert.incidentId}`);
    receivedAlerts.push(alert);
  });

  socket.on('newIncident', (incident) => {
    console.log(`[Socket.IO] 📢 newIncident received! ID: ${incident.id}, Title: ${incident.title}, Source: ${incident.detection_source}`);
    receivedIncidents.push(incident);
  });

  socket.on('cctv:incident-evidence', (ev) => {
    console.log(`[Socket.IO] 📹 cctv:incident-evidence received! Camera: ${ev.cameraId}, Snapshot: ${ev.snapshotUrl}`);
    receivedEvidence.push(ev);
  });

  await new Promise(r => socket.on('connect', r));
  console.log('[Socket.IO] Control Room mock client connected.');

  let adminToken = '';

  try {
    // 1. Admin Login
    console.log('\n--- 1. Authenticate Admin ---');
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@crisisgrid.com',
      password: 'admin123'
    });
    if (adminLogin.status !== 200 || !adminLogin.data?.token) {
      throw new Error(`Admin login failed: status ${adminLogin.status}`);
    }
    adminToken = adminLogin.data.token;
    console.log('Admin Token acquired successfully.');

    // 2. Fetch online cameras
    console.log('\n--- 2. Query Camera Fleet ---');
    const camsRes = await request('GET', '/api/cameras', null, adminToken);
    const cameras = camsRes.data?.data || [];
    const targetCam = cameras.find(c => c.status === 'ONLINE') || cameras[0];
    if (!targetCam) {
      throw new Error('No camera found in surveillance fleet.');
    }
    console.log(`Selected target camera: ID=${targetCam.id}, Code=${targetCam.camera_id}, Name=${targetCam.name}`);

    // 3. Trigger Autonomous CCTV Emergency Detection
    console.log(`\n--- 3. Triggering Autonomous Detection on ${targetCam.camera_id} ---`);
    const detectRes = await request('POST', `/api/cameras/${targetCam.id}/detect-incident`, {
      eventType: 'Industrial Chemical Leak',
      severity: 'Critical',
      description: 'Autonomous computer vision detected toxic fume cloud expansion and worker evacuation at industrial loading dock.'
    }, adminToken);

    console.log('Detection Response Status:', detectRes.status);
    if (detectRes.status !== 201 && detectRes.status !== 200) {
      throw new Error(`Detection failed with status ${detectRes.status}: ${JSON.stringify(detectRes.data)}`);
    }

    const resData = detectRes.data?.data;
    console.log('Auto-Created Incident ID:', resData.incident?.id);
    console.log('Formatted Incident Code:', resData.incident?.incident_id);
    console.log('Detection Source:', resData.incident?.detection_source);
    console.log('Detecting Camera:', resData.incident?.detection_camera_code);
    console.log('Captured Snapshot:', resData.cctvEvidence?.snapshotUrl);

    // Wait a moment for Socket.IO event processing
    await new Promise(r => setTimeout(r, 1000));

    // 4. Verify Socket.IO Alert Delivery to Control Room
    console.log('\n--- 4. Verifying Control Room Socket.IO Broadcasts ---');
    if (receivedAlerts.length === 0) {
      throw new Error('FAILED: cctv:auto-detection-alert was not received by Control Room client!');
    }
    const alert = receivedAlerts[0];
    console.log('✅ PASS: cctv:auto-detection-alert verified');
    console.log(`   - Alert Type: ${alert.alertType}`);
    console.log(`   - Camera: ${alert.cameraId} (${alert.cameraName})`);
    console.log(`   - Severity: ${alert.severity}`);
    console.log(`   - Incident Code: ${alert.incidentId}`);
    console.log(`   - Snapshot URL: ${alert.evidence?.snapshotUrl}`);

    if (receivedIncidents.length === 0) {
      throw new Error('FAILED: newIncident was not received by client!');
    }
    console.log('✅ PASS: newIncident event verified');

    // 5. Verify Database Records
    console.log('\n--- 5. Verifying Database Records ---');
    const incidentDbId = resData.incident.id;
    const [incRows] = await db.query('SELECT * FROM incidents WHERE id = ?', [incidentDbId]);
    if (incRows.length === 0) {
      throw new Error(`Incident ${incidentDbId} not found in database!`);
    }
    const dbInc = incRows[0];
    console.log('Database Incident Record:');
    console.log(`   - detection_source: ${dbInc.detection_source}`);
    console.log(`   - detection_camera_id: ${dbInc.detection_camera_id}`);
    console.log(`   - title: ${dbInc.title}`);

    if (dbInc.detection_source !== 'CCTV_AUTO_DETECTION') {
      throw new Error(`Expected detection_source to be CCTV_AUTO_DETECTION, got ${dbInc.detection_source}`);
    }

    const [evRows] = await db.query('SELECT * FROM cctv_evidence WHERE incident_id = ?', [incidentDbId]);
    console.log(`Archived CCTV Evidence rows: ${evRows.length}`);
    if (evRows.length === 0) {
      throw new Error('No CCTV evidence linked to incident in database!');
    }
    console.log(`   - First evidence file: ${evRows[0].file_path}`);
    console.log(`   - First evidence camera_id: ${evRows[0].camera_id}`);

    // 6. Verify Incident Details API
    console.log('\n--- 6. Verifying Incident Details API endpoint ---');
    const detailsRes = await request('GET', `/api/incidents/${incidentDbId}`, null, adminToken);
    if (detailsRes.status !== 200) {
      throw new Error(`Failed to fetch incident details: ${detailsRes.status}`);
    }
    const det = detailsRes.data.data;
    console.log(`   - Details detection_source: ${det.detection_source}`);
    console.log(`   - Details camera code: ${det.detection_camera_code}`);
    console.log(`   - Details reporter: ${det.reporter_name}`);
    console.log(`   - Evidence attached count: ${det.cctvEvidence?.length || 0}`);
    console.log(`   - Nearby cameras count: ${det.nearbyCameras?.length || 0}`);

    console.log('\n================================================================');
    console.log('🎉 ALL CCTV AUTONOMOUS DETECTION TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (socket) socket.disconnect();
    server.close();
    await db.end();
    process.exit(process.exitCode || 0);
  }
}

runCctvDetectionTests();
